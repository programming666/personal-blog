// =====================================================================
// 通用 OAuth2 / OIDC 第三方登录提供方
// ---------------------------------------------------------------------
// 设计约定:
//  - 配置存 DB(Setting 键 'auth.oauth.providers'),后台「登录方式」面板可视化维护。
//    没有 DB 配置时回退内置默认项 [{ id: 'github', type: 'github' }],即保持改造前行为。
//  - clientSecret 只落库、永不回传前端:admin 接口只给 hasClientSecret 标记。
//    保存时 clientSecret 传空字符串/undefined = 保持原值,null = 显式清空。
//  - type 'github' 为内置类型,实际走 passport-github2 的既有流程(/api/auth/github),
//    这里只负责它的展示配置(文案/图标)与开关。
//  - type 'oauth2' 走标准 authorization code 流程,支持 PKCE 与 client_secret_basic。
//  - 用户查找只认 (provider, providerUserId),绝不按 username/email 自动合并到已有账号
//    —— 与 GitHub 流程相同的安全约定,避免第三方身份吞掉 admin / 历史评论作者。
// =====================================================================
const crypto = require('crypto');
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const Setting = require('../models/Setting');
const User = require('../models/User');

const SETTING_KEY = 'auth.oauth.providers';
const MAX_PROVIDERS = 20;
const HTTP_TIMEOUT = 15000;

// id 即路由 slug:/api/auth/oauth/<id>
const ID_RE = /^[a-z0-9][a-z0-9_-]{1,39}$/;
// 被路由占用的 slug,不可作为提供方 id
const RESERVED_IDS = new Set(['providers', 'callback', 'admin', 'login', 'logout', 'me']);
// 自定义图标只接受本服务自己产出的文件
const ICON_PATH_RE = /^uploads\/oauth-[A-Za-z0-9._-]+\.png$/;
const ICON_PRESET_RE = /^$|^[a-z0-9][a-z0-9-]{1,23}$/;
const TOKEN_AUTH_STYLES = new Set(['body', 'basic', 'none']);
const TYPES = new Set(['github', 'oauth2']);

// 第三方返回的邮箱是否「够格」直接落库:必须与 models/User.js 的 email 校验一致,
// 不然 User.create 会抛 ValidationError,把一次成功的第三方登录变成 500。
// (注意 `+` 标签地址、@oauth.local / @github.local 这类占位域名都必须放行)
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

// 字段映射候选(dot path,逗号分隔多个候选,取第一个非空值)
const DEFAULT_MAPPING = {
  id: 'sub,id,user_id,userId,uuid,uid,login,username,preferred_username,name',
  name: 'name,display_name,nickname,preferred_username,login,username',
  email: 'email,mail,email_address,emailAddress',
  avatar: 'avatar_url,avatarUrl,picture,avatar,headimgurl,profile_image_url'
};

const badRequest = (msg) => Object.assign(new Error(msg), { status: 400 });

const toStr = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
};

// 'gitee' -> 'Gitee','company-sso' -> 'Company Sso'
const titleize = (id) =>
  String(id || '')
    .split(/[-_]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ---------- 内置默认(无 DB 配置时) ----------
function defaultProviders() {
  return [
    {
      id: 'github',
      type: 'github',
      enabled: true,
      order: 0,
      name: 'GitHub',
      label: { zh: '使用 GitHub 登录', en: 'Sign in with GitHub' },
      icon: { path: '', url: '', preset: 'github' }
    }
  ];
}

// ---------- 单个提供方归一化 ----------
function normalizeProvider(raw, index = 0) {
  const id = String(raw?.id || '').trim().toLowerCase();
  const type = raw?.type === 'github' ? 'github' : 'oauth2';
  const icon = raw?.icon && typeof raw.icon === 'object' ? raw.icon : {};
  return {
    id: type === 'github' && !id ? 'github' : id,
    type,
    enabled: raw?.enabled !== false,
    order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : index,
    name: toStr(raw?.name),
    label: {
      zh: toStr(raw?.label?.zh),
      en: toStr(raw?.label?.en)
    },
    icon: {
      path: toStr(icon.path),
      url: toStr(icon.url),
      preset: toStr(icon.preset)
    },
    // ---- oauth2 专属 ----
    clientId: toStr(raw?.clientId),
    clientSecret: toStr(raw?.clientSecret),
    authorizationUrl: toStr(raw?.authorizationUrl),
    tokenUrl: toStr(raw?.tokenUrl),
    userInfoUrl: toStr(raw?.userInfoUrl),
    emailUrl: toStr(raw?.emailUrl),
    scope: toStr(raw?.scope),
    tokenAuthStyle: TOKEN_AUTH_STYLES.has(raw?.tokenAuthStyle) ? raw.tokenAuthStyle : 'body',
    pkce: raw?.pkce === true,
    redirectUri: toStr(raw?.redirectUri),
    mapping: {
      id: toStr(raw?.mapping?.id),
      name: toStr(raw?.mapping?.name),
      email: toStr(raw?.mapping?.email),
      avatar: toStr(raw?.mapping?.avatar)
    }
  };
}

// ---------- 校验 + 清洗(保存用) ----------
function sanitizeUrl(value, fieldLabel) {
  const s = toStr(value);
  if (!s) return '';
  let u;
  try {
    u = new URL(s);
  } catch {
    throw badRequest(`${fieldLabel} 不是合法 URL`);
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw badRequest(`${fieldLabel} 仅支持 http/https`);
  }
  return u.toString();
}

/**
 * 校验并清洗前端提交的提供方列表。
 * @param {Array} list 前端提交的数组
 * @param {Array} existing 当前 DB 中的配置(用于保留未提交的 clientSecret)
 */
function sanitizeProviders(list, existing = []) {
  if (!Array.isArray(list)) throw badRequest('providers 必须是数组');
  if (list.length > MAX_PROVIDERS) throw badRequest(`最多支持 ${MAX_PROVIDERS} 个登录方式`);

  const prevById = new Map(existing.map((p) => [p.id, p]));
  const seen = new Set();

  return list.map((raw, index) => {
    const p = normalizeProvider(raw, index);

    if (!p.id || !ID_RE.test(p.id) || RESERVED_IDS.has(p.id)) {
      throw badRequest(`登录方式 id 不合法(小写字母/数字开头,可含 - _,且不能用保留字):${p.id || '(空)'}`);
    }
    if (seen.has(p.id)) throw badRequest(`登录方式 id 重复:${p.id}`);
    seen.add(p.id);

    if (!TYPES.has(raw?.type)) throw badRequest(`${p.id}:type 只能是 github 或 oauth2`);
    if (p.id === 'github') p.type = 'github';
    if (p.type === 'github' && p.id !== 'github') {
      throw badRequest(`${p.id}:type=github 仅允许 id 为 github 的内置项`);
    }

    if (!p.name) p.name = titleize(p.id) || p.id;
    p.name = p.name.slice(0, 40);
    p.label.zh = p.label.zh.slice(0, 60);
    p.label.en = p.label.en.slice(0, 60);

    // ---- 图标 ----
    if (p.icon.path && !ICON_PATH_RE.test(p.icon.path)) {
      throw badRequest(`${p.id}:图标路径不合法`);
    }
    if (p.icon.url) {
      const url = sanitizeUrl(p.icon.url, `${p.id} 图标地址`);
      // CSP img-src 只放行 self/data:/https:,http 图标在浏览器里必然被拦
      if (!url.startsWith('https:')) throw badRequest(`${p.id}:自定义图标地址必须是 https`);
      p.icon.url = url;
    }
    if (!ICON_PRESET_RE.test(p.icon.preset)) throw badRequest(`${p.id}:图标预设名不合法`);

    // ---- oauth2 必填项 ----
    if (p.type === 'oauth2') {
      if (!p.clientId) throw badRequest(`${p.id}:缺少 client_id`);
      p.authorizationUrl = sanitizeUrl(p.authorizationUrl, `${p.id} 授权地址`);
      p.tokenUrl = sanitizeUrl(p.tokenUrl, `${p.id} Token 地址`);
      p.userInfoUrl = sanitizeUrl(p.userInfoUrl, `${p.id} 用户信息地址`);
      p.emailUrl = p.emailUrl ? sanitizeUrl(p.emailUrl, `${p.id} 邮箱地址`) : '';
      p.redirectUri = p.redirectUri ? sanitizeUrl(p.redirectUri, `${p.id} 回调地址`) : '';
      if (!p.authorizationUrl) throw badRequest(`${p.id}:缺少授权地址`);
      if (!p.tokenUrl) throw badRequest(`${p.id}:缺少 Token 地址`);
      if (!p.userInfoUrl) throw badRequest(`${p.id}:缺少用户信息地址`);
      if (!p.scope) p.scope = 'openid profile email';
      p.scope = p.scope.slice(0, 200);
      if (p.redirectUri && !new URL(p.redirectUri).pathname.startsWith('/api/auth/oauth/')) {
        throw badRequest(`${p.id}:自定义回调地址必须指向本服务的 /api/auth/oauth/ 路径`);
      }
    }

    // ---- 展示顺序去重 ----
    p.order = index;

    // ---- clientSecret:'' / undefined = 保持原值,null = 清空 ----
    const incoming = raw?.clientSecret;
    const prev = prevById.get(p.id);
    if (p.type === 'github') {
      p.clientSecret = '';
    } else if (incoming === null) {
      p.clientSecret = '';
    } else if (typeof incoming === 'string' && incoming.trim()) {
      p.clientSecret = incoming.trim();
    } else {
      p.clientSecret = prev?.clientSecret || '';
    }

    return p;
  });
}

// ---------- 读写 DB ----------
async function getProviders() {
  const doc = await Setting.findOne({ key: SETTING_KEY }).lean();
  const raw = doc?.value;
  // 注意区分「没有配置文档 / 文档结构损坏」与「管理员显式保存了空列表」:
  // 前者回退内置默认(保持改造前行为),后者必须尊重 —— 否则管理员想关掉所有登录方式时
  // GitHub 按钮会悄悄复活。
  if (!doc || !Array.isArray(raw)) return defaultProviders();
  return raw
    .map((p, i) => normalizeProvider(p, i))
    .sort((a, b) => a.order - b.order)
    .map((p, i) => ({ ...p, order: i }));
}

async function getProviderById(id) {
  const providers = await getProviders();
  return providers.find((p) => p.id === id) || null;
}

/** 前端登录页用的公开列表:不含任何密钥,文案已按语言组装好兜底值 */
async function getPublicProviders() {
  const providers = await getProviders();
  return providers
    .filter((p) => p.enabled)
    .map((p) => ({
      id: p.id,
      type: p.type,
      name: p.name,
      label: {
        zh: p.label.zh || `使用 ${p.name} 登录`,
        en: p.label.en || `Sign in with ${p.name}`
      },
      icon: { url: p.icon.url, path: p.icon.path, preset: p.icon.preset },
      startPath: p.type === 'github' ? '/api/auth/github' : `/api/auth/oauth/${p.id}`
    }));
}

/** 后台面板用的完整列表:隐藏密钥本体,附上回调地址与默认值提示 */
async function getAdminProviders(req) {
  const providers = await getProviders();
  return providers.map((p) => {
    const { clientSecret, ...rest } = p;
    return {
      ...rest,
      hasClientSecret: !!clientSecret,
      callbackUrl: resolveCallbackUrl(req, p)
    };
  });
}

// 与内置默认逐字段相等的配置不落库 —— 保持“未配置”状态,
// 否则默认值一旦冻进 DB(例如后台只点了一下保存)就再也跟不上版本的默认调整。
// 注意必须逐字段比较:只放宽 name/文案会把“管理员只改了名称”的改动悄悄丢掉。
function isDefaultConfig(list) {
  if (list.length !== 1) return false;
  const [def] = defaultProviders();
  const p = list[0];
  return (
    p.id === def.id &&
    p.type === def.type &&
    p.enabled === def.enabled &&
    p.name === def.name &&
    p.label.zh === def.label.zh &&
    p.label.en === def.label.en &&
    p.icon.preset === def.icon.preset &&
    !p.icon.path &&
    !p.icon.url
  );
}

async function saveProviders(list) {
  const existing = await getProviders();
  const clean = sanitizeProviders(list, existing);

  if (isDefaultConfig(clean)) {
    await Setting.deleteOne({ key: SETTING_KEY });
    return clean;
  }

  await Setting.findOneAndUpdate(
    { key: SETTING_KEY },
    { key: SETTING_KEY, value: clean },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return clean;
}

// ---------- 回调地址 ----------
/**
 * 决定 redirect_uri,三方必须完全一致:
 *   1) 该提供方显式配置的 redirectUri
 *   2) OAUTH_REDIRECT_BASE / BACKEND_URL + 标准路径
 *   3) 按当前请求推导(本地开发)
 */
function resolveCallbackUrl(req, provider) {
  if (provider.redirectUri) return provider.redirectUri;
  const base = (process.env.OAUTH_REDIRECT_BASE || process.env.BACKEND_URL || '').replace(/\/+$/, '');
  if (base) return `${base}/api/auth/oauth/${provider.id}/callback`;
  const host = req?.get?.('host');
  if (host) return `${req.protocol}://${host}/api/auth/oauth/${provider.id}/callback`;
  return `http://localhost:${process.env.PORT || 8089}/api/auth/oauth/${provider.id}/callback`;
}

// ---------- state:HMAC 签名,一次一用 ----------
const STATE_TTL = 10 * 60 * 1000;

function stateSecret() {
  return process.env.JWT_SECRET || 'oauth-provider-state-dev-secret';
}

function signState(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, e: Date.now() + STATE_TTL })).toString('base64url');
  const sig = crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyState(raw) {
  if (typeof raw !== 'string') return null;
  const idx = raw.indexOf('.');
  if (idx <= 0 || idx === raw.length - 1) return null;
  const body = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  const expected = crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url');
  if (!timingSafeEqualStr(sig, expected)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || typeof payload.n !== 'string' || typeof payload.p !== 'string' || typeof payload.r !== 'string') return null;
  if (!payload.e || Date.now() > payload.e) return null;
  return payload;
}

// ---------- PKCE ----------
function createPkce() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

// ---------- 出站请求(与 AI 模块一样支持代理) ----------
const agentCache = new Map();
function getProxyAgent(proxyUrl) {
  if (!proxyUrl) return null;
  if (agentCache.has(proxyUrl)) return agentCache.get(proxyUrl);
  let agent = null;
  try {
    const scheme = String(proxyUrl).split(':')[0].toLowerCase();
    if (scheme.startsWith('socks')) agent = new SocksProxyAgent(proxyUrl);
    else if (scheme === 'http' || scheme === 'https') agent = new HttpsProxyAgent(proxyUrl);
  } catch {
    agent = null;
  }
  agentCache.set(proxyUrl, agent);
  return agent;
}

function outboundProxyUrl() {
  return (
    process.env.OAUTH_PROXY ||
    process.env.AI_PROXY ||
    process.env.GEMINI_PROXY ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    ''
  );
}

async function httpRequest({ method, url, headers, body }) {
  const agent = getProxyAgent(outboundProxyUrl());
  const res = await axios({
    method,
    url,
    headers,
    data: body,
    timeout: HTTP_TIMEOUT,
    maxRedirects: 5,
    responseType: 'text',
    transformResponse: [(d) => d],
    validateStatus: () => true,
    ...(agent ? { httpAgent: agent, httpsAgent: agent, proxy: false } : {})
  });
  return { status: res.status, text: typeof res.data === 'string' ? res.data : JSON.stringify(res.data), headers: res.headers || {} };
}

// 老式提供方可能返回 form-urlencoded
function parseTokenBody(text, contentType) {
  const body = String(text || '').trim();
  if (!body) return {};
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    /* fallthrough */
  }
  if (String(contentType || '').includes('json')) return {};
  const out = {};
  new URLSearchParams(body).forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

// 'emails.0.value' / 'emails.value'(数组自动取第一个非空)
function pickPath(obj, path) {
  let cur = obj;
  for (const part of String(path).split('.')) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      if (/^\d+$/.test(part)) {
        cur = cur[Number(part)];
        continue;
      }
      cur = cur
        .map((el) => (el && typeof el === 'object' ? el[part] : undefined))
        .find((v) => v !== undefined && v !== null && v !== '');
      continue;
    }
    if (typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

// spec 里的候选优先,找不到再退回默认候选
function pickField(raw, spec, defaults) {
  const paths = [...String(spec || '').split(','), ...String(defaults || '').split(',')]
    .map((p) => p.trim())
    .filter(Boolean);
  for (const p of paths) {
    const v = pickPath(raw, p);
    const s = toStr(v);
    if (s) return s;
  }
  return '';
}

// ---------- 协议:换 token + 取用户信息 ----------
async function exchangeCode(provider, { code, redirectUri, codeVerifier }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: provider.clientId
  });
  if (codeVerifier) body.set('code_verifier', codeVerifier);

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json'
  };

  if (provider.tokenAuthStyle === 'basic') {
    if (provider.clientSecret) {
      headers.Authorization = `Basic ${Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString('base64')}`;
    }
  } else if (provider.tokenAuthStyle === 'body') {
    if (provider.clientSecret) body.set('client_secret', provider.clientSecret);
  }

  const res = await httpRequest({ method: 'POST', url: provider.tokenUrl, headers, body: body.toString() });
  const parsed = parseTokenBody(res.text, res.headers['content-type']);
  if (res.status < 200 || res.status >= 300 || !parsed.access_token) {
    const detail = parsed.error_description || parsed.error || parsed.message || `HTTP ${res.status}`;
    throw Object.assign(new Error(`换取 access_token 失败:${detail}`), { status: 502 });
  }
  return parsed;
}

// 无邮箱时的补取(GitHub /user/emails 风格)
async function fetchFallbackEmail(provider, accessToken) {
  if (!provider.emailUrl) return '';
  const res = await httpRequest({
    method: 'GET',
    url: provider.emailUrl,
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
  });
  if (res.status < 200 || res.status >= 300) return '';
  let data;
  try {
    data = JSON.parse(res.text);
  } catch {
    return res.text.trim().slice(0, 200);
  }
  if (Array.isArray(data)) {
    const pick =
      data.find((e) => e && e.primary && e.verified) ||
      data.find((e) => e && e.verified) ||
      data.find((e) => e && e.primary) ||
      data[0];
    return toStr(pick?.email);
  }
  return toStr(data?.email || data?.mail);
}

/** 拉取并映射第三方用户信息 → { providerUserId, username, displayName, email, avatar } */
async function fetchProfile(provider, accessToken) {
  const res = await httpRequest({
    method: 'GET',
    url: provider.userInfoUrl,
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
  });
  if (res.status < 200 || res.status >= 300) {
    throw Object.assign(new Error(`获取用户信息失败:HTTP ${res.status}`), { status: 502 });
  }
  let raw;
  try {
    raw = JSON.parse(res.text);
  } catch {
    throw Object.assign(new Error('用户信息接口返回的不是 JSON'), { status: 502 });
  }
  if (!raw || typeof raw !== 'object') {
    throw Object.assign(new Error('用户信息接口返回内容为空'), { status: 502 });
  }

  const providerUserId = pickField(raw, provider.mapping.id, DEFAULT_MAPPING.id);
  if (!providerUserId) {
    throw Object.assign(new Error('无法从用户信息中解析出用户 id,请检查「字段映射」'), { status: 502 });
  }

  const displayName = pickField(raw, provider.mapping.name, DEFAULT_MAPPING.name);
  const avatar = pickField(raw, provider.mapping.avatar, DEFAULT_MAPPING.avatar);
  let email = pickField(raw, provider.mapping.email, DEFAULT_MAPPING.email);
  if (!email) email = await fetchFallbackEmail(provider, accessToken);

  return {
    providerUserId,
    username: displayName || `${provider.id}-${providerUserId}`,
    displayName: displayName || `${provider.id}-${providerUserId}`,
    email,
    avatar
  };
}

/**
 * 按 (provider, providerUserId) 查用户;不存在则新建。
 * 刻意不做 username/email 合并 —— 见文件头说明。
 */
async function upsertUser(provider, profile) {
  const providerUserId = String(profile.providerUserId);
  // 唯一身份的两种表示:oauthKeys 是单路径唯一索引用的扁平键(新),
  // oauthAccounts 保留做展示/绑定(兼容已经用旧字段建过号的数据)
  const oauthKey = `${provider.id}:${providerUserId}`;
  const identityQuery = {
    role: { $ne: 'admin' },
    $or: [
      { oauthKeys: oauthKey },
      { oauthAccounts: { $elemMatch: { provider: provider.id, providerUserId } } }
    ]
  };

  const user = await User.findOne(identityQuery);
  if (user) return user;

  // 派生 username / 本地邮箱时统一净化:providerUserId 可能是 `auth0|5f8`、`google-oauth2|110`
  // 这种带 `|` 的说明符,直接拼进 email 的本地部分会让 User 的 email 校验失败、建号直接 500。
  const localPart =
    `${provider.id}-${providerUserId}`.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 40) ||
    `user-${Date.now().toString(36)}`;

  const safeBase =
    String(profile.username || '')
      .replace(/[^A-Za-z0-9_.-]/g, '')
      .slice(0, 40) || localPart;

  let username = safeBase;
  if (await User.exists({ username })) username = `${safeBase}-${localPart}`.slice(0, 50);
  if (await User.exists({ username })) username = `${safeBase}-${Date.now()}`.slice(0, 50);

  // 第三方给的邮箱未必合法(scope 没给邮箱 / 私有邮箱 / 带 `+` 的地址 / 已被别的账号占用),
  // 任何一种都退回本服务的占位地址 —— 占位地址里的域名必须落在 User.email 的正则允许范围内。
  const candidate = typeof profile.email === 'string' ? profile.email.trim() : '';
  let email = candidate;
  if (!email || email.length > 254 || !EMAIL_RE.test(email) || (await User.exists({ email }))) {
    email = `${localPart}@oauth.local`;
    if (await User.exists({ email })) email = `${localPart}-${Date.now()}@oauth.local`;
  }

  const fields = () => ({
    username,
    email,
    name: profile.displayName || username,
    avatar: profile.avatar || undefined,
    oauthKeys: [oauthKey],
    oauthAccounts: [{ provider: provider.id, providerUserId, linkedAt: new Date() }]
  });

  try {
    return await User.create(fields());
  } catch (error) {
    // 并发首登(同一身份两个标签页同时回调):唯一索引挡下后回读同一条记录,而不是抛给用户
    if (error && error.code === 11000) {
      const existing = await User.findOne(identityQuery);
      if (existing) return existing;

      // 撞的是 username / email 的唯一键(预检与 create 之间的竞态):按冲突字段改名重试一次
      const ts = Date.now();
      if (error.keyPattern && error.keyPattern.username) username = `${safeBase}-${ts}`.slice(0, 50);
      if (error.keyPattern && error.keyPattern.email) email = `${localPart}-${ts}@oauth.local`;
      return User.create(fields());
    }
    throw error;
  }
}

module.exports = {
  SETTING_KEY,
  MAX_PROVIDERS,
  DEFAULT_MAPPING,
  defaultProviders,
  normalizeProvider,
  sanitizeProviders,
  getProviders,
  getProviderById,
  getPublicProviders,
  getAdminProviders,
  saveProviders,
  resolveCallbackUrl,
  signState,
  verifyState,
  createPkce,
  exchangeCode,
  fetchProfile,
  upsertUser,
  pickPath,
  titleize
};
