const crypto = require('crypto');
const User = require('../models/User');
const passport = require('passport');

// OAuth CSRF / account-linking 防护:
// /api/auth/github 起跳时生成一次性 state,同时写 HttpOnly cookie;
// /api/auth/github/callback 校验 query.state 与 cookie 一致才放行。
const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_MAX_AGE = 10 * 60 * 1000; // 10 分钟,足够走完 GitHub 授权

function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: OAUTH_STATE_MAX_AGE,
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

exports.githubAuth = (req, res, next) => {
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions());
  passport.authenticate('github', {
    scope: ['user:email'],
    state,
    session: false
  })(req, res, next);
};

exports.githubAuthCallback = (req, res, next) => {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  const expected = req.cookies && req.cookies[OAUTH_STATE_COOKIE];
  const received = req.query && req.query.state;

  // 一次性 — 校验完立刻清,无论成败
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });

  if (!timingSafeEqualStr(expected, received)) {
    return res.redirect(`${frontend}/login?error=oauth_state_mismatch`);
  }

  passport.authenticate('github', { failureRedirect: '/login', session: false }, (err, user) => {
    if (err) {
      return res.redirect(`${frontend}/login?error=github_auth_failed`);
    }
    if (!user) {
      return res.redirect(`${frontend}/login?error=user_not_found`);
    }

    const token = user.getSignedJwtToken();

    const redirectUrl = `${frontend}/github-callback?` +
      `token=${token}&` +
      `userId=${user._id}&` +
      `username=${encodeURIComponent(user.username)}&` +
      `email=${encodeURIComponent(user.email)}&` +
      `name=${encodeURIComponent(user.name || user.username)}&` +
      `avatar=${encodeURIComponent(user.avatar || '')}`;

    res.redirect(redirectUrl);
  })(req, res, next);
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.logout = (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
