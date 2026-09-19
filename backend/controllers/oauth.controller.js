const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  getProviderById,
  getPublicProviders,
  getAdminProviders,
  getProviders,
  saveProviders,
  resolveCallbackUrl,
  signState,
  verifyState,
  createPkce,
  exchangeCode,
  fetchProfile,
  upsertUser
} = require('../services/oauthProviders');

// OAuth CSRF 防护:与 GitHub 流程同一套路,state 经 HMAC 签名后存 HttpOnly cookie,
// 回调时校验签名 + 有效期 + 一次性消费。payload 里顺带带上 redirect_uri 与 PKCE verifier,
// 保证换 token 时用的三处参数与授权跳转时完全一致(不受 Host/代理变化影响)。
const STATE_COOKIE = 'oauth2_state';
const STATE_MAX_AGE = 10 * 60 * 1000;

const frontendBase = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');

function stateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: STATE_MAX_AGE,
    path: '/'
  };
}

function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// 后台接口出错:400 回显校验信息,其余脱敏
function fail(res, error, fallback = '服务器内部错误') {
  if (error && error.status === 400) {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error('[oauth]', error?.message || error);
  return res.status(500).json({ success: false, message: fallback });
}

const uploadDir = path.join(__dirname, '..', 'uploads');

// 只删自己 uploads/ 下的文件,顺带挡目录穿越
function removeUploadedFile(relPath) {
  if (!relPath) return;
  const target = path.resolve(__dirname, '..', relPath);
  if (!target.startsWith(path.resolve(uploadDir))) return;
  fs.promises.unlink(target).catch(() => {});
}

// ==================== 公开接口 ====================

/** GET /api/auth/oauth/providers — 登录页要渲染的按钮列表(不含任何密钥) */
exports.listPublicProviders = async (req, res) => {
  try {
    const providers = await getPublicProviders();
    res.status(200).json({ success: true, data: providers });
  } catch (error) {
    fail(res, error);
  }
};

/** GET /api/auth/oauth/:id — 跳到第三方授权页 */
exports.startAuth = async (req, res) => {
  const frontend = frontendBase();
  try {
    const provider = await getProviderById(String(req.params.id || '').toLowerCase());
    if (!provider || !provider.enabled || provider.type !== 'oauth2') {
      return res.redirect(`${frontend}/login?error=provider_unavailable`);
    }

    const redirectUri = resolveCallbackUrl(req, provider);
    const nonce = crypto.randomBytes(32).toString('hex');
    const pkce = provider.pkce ? createPkce() : null;

    res.cookie(
      STATE_COOKIE,
      signState({ n: nonce, p: provider.id, r: redirectUri, ...(pkce ? { v: pkce.verifier } : {}) }),
      stateCookieOptions()
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: provider.clientId,
      redirect_uri: redirectUri,
      state: nonce,
      scope: provider.scope || 'openid profile email'
    });
    if (pkce) {
      params.set('code_challenge', pkce.challenge);
      params.set('code_challenge_method', 'S256');
    }

    const sep = /[?&]$/.test(provider.authorizationUrl) ? '' : provider.authorizationUrl.includes('?') ? '&' : '?';
    return res.redirect(`${provider.authorizationUrl}${sep}${params.toString()}`);
  } catch (error) {
    console.error('[oauth] startAuth failed', error?.message || error);
    return res.redirect(`${frontend}/login?error=oauth_failed`);
  }
};

/** GET /api/auth/oauth/:id/callback — 第三方回调:校验 state → 换 token → 取用户信息 → 发本站 JWT */
exports.handleCallback = async (req, res) => {
  const frontend = frontendBase();
  const providerId = String(req.params.id || '').toLowerCase();

  const cookieRaw = req.cookies && req.cookies[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, { path: '/' });

  // 用户在第三方页点了“拒绝”
  if (req.query.error) {
    console.warn('[oauth] provider returned error', providerId, req.query.error);
    return res.redirect(`${frontend}/login?error=oauth_denied`);
  }

  const payload = verifyState(cookieRaw);
  const stateMatches =
    payload && payload.p === providerId && timingSafeEqualStr(payload.n, String(req.query.state || ''));
  if (!stateMatches) {
    return res.redirect(`${frontend}/login?error=oauth_state_mismatch`);
  }

  const code = String(req.query.code || '');
  if (!code) {
    return res.redirect(`${frontend}/login?error=oauth_exchange_failed`);
  }

  try {
    const provider = await getProviderById(providerId);
    if (!provider || !provider.enabled || provider.type !== 'oauth2') {
      return res.redirect(`${frontend}/login?error=provider_unavailable`);
    }

    const token = await exchangeCode(provider, {
      code,
      redirectUri: payload.r,
      codeVerifier: payload.v
    });
    const profile = await fetchProfile(provider, token.access_token);
    const user = await upsertUser(provider, profile);

    if (user.canLogin === false) {
      return res.redirect(`${frontend}/login?error=account_suspended`);
    }

    const jwt = user.getSignedJwtToken();
    const redirectUrl =
      `${frontend}/oauth-callback?` +
      `token=${jwt}&` +
      `userId=${user._id}&` +
      `username=${encodeURIComponent(user.username)}&` +
      `email=${encodeURIComponent(user.email)}&` +
      `name=${encodeURIComponent(user.name || user.username)}&` +
      `avatar=${encodeURIComponent(user.avatar || '')}&` +
      `provider=${encodeURIComponent(provider.id)}`;

    return res.redirect(redirectUrl);
  } catch (error) {
    // 细节只进服务端日志:URL 里给一个笼统的错误码,避免把第三方错误描述泄露到浏览器历史
    console.error('[oauth] callback failed', providerId, error?.message || error);
    return res.redirect(`${frontend}/login?error=oauth_failed`);
  }
};

// ==================== 后台接口(仅 admin) ====================

/** GET /api/admin/oauth/providers */
exports.getProvidersConfig = async (req, res) => {
  try {
    const providers = await getAdminProviders(req);
    res.status(200).json({ success: true, data: { providers } });
  } catch (error) {
    fail(res, error);
  }
};

/** PUT /api/admin/oauth/providers — 整体替换(顺序即展示顺序) */
exports.saveProvidersConfig = async (req, res) => {
  try {
    const list = req.body && req.body.providers;
    await saveProviders(list);
    const providers = await getAdminProviders(req);
    res.status(200).json({ success: true, data: { providers } });
  } catch (error) {
    fail(res, error);
  }
};

/** POST /api/admin/oauth/providers/:id/icon — 上传自定义图标(转 128x128 PNG) */
exports.uploadProviderIcon = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, message: '请上传图片' });
    }
    const id = String(req.params.id || '').toLowerCase();
    const providers = await getProviders();
    const idx = providers.findIndex((p) => p.id === id);
    if (idx < 0) {
      removeUploadedFile(req.file.path);
      return res.status(404).json({ success: false, message: '请先保存该登录方式,再上传图标' });
    }

    const oldPath = providers[idx].icon.path;
    providers[idx].icon.path = req.file.path;
    await saveProviders(providers);
    if (oldPath && oldPath !== req.file.path) removeUploadedFile(oldPath);

    const list = await getAdminProviders(req);
    res.status(200).json({ success: true, data: { providers: list } });
  } catch (error) {
    if (req.file && req.file.path) removeUploadedFile(req.file.path);
    fail(res, error);
  }
};

/** DELETE /api/admin/oauth/providers/:id/icon — 删除自定义图标(回落到预设图标) */
exports.deleteProviderIcon = async (req, res) => {
  try {
    const id = String(req.params.id || '').toLowerCase();
    const providers = await getProviders();
    const idx = providers.findIndex((p) => p.id === id);
    if (idx < 0) {
      return res.status(404).json({ success: false, message: '登录方式不存在' });
    }

    const oldPath = providers[idx].icon.path;
    providers[idx].icon.path = '';
    await saveProviders(providers);
    removeUploadedFile(oldPath);

    const list = await getAdminProviders(req);
    res.status(200).json({ success: true, data: { providers: list } });
  } catch (error) {
    fail(res, error);
  }
};
