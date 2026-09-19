const express = require('express');
const {
  listPublicProviders,
  startAuth,
  handleCallback
} = require('../controllers/oauth.controller');
const { oauthStartLimiter, oauthCallbackLimiter, oauthProvidersLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

// 登录页读取可用的第三方登录方式(仅返回启用项,不含任何密钥)
router.get('/providers', oauthProvidersLimiter, listPublicProviders);

// 起跳 —— 生成 state、写 HttpOnly cookie、302 到第三方授权页
router.get('/:id', oauthStartLimiter, startAuth);
// 回调 —— 校验 state → 换 token → 取用户信息 → 302 回前端并带上本站 JWT
router.get('/:id/callback', oauthCallbackLimiter, handleCallback);

module.exports = router;
