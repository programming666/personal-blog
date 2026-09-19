const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const slowDown = require('express-slow-down');

const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;

const denyMessage = (msg = '操作过于频繁，请稍后再试') => ({
  success: false,
  message: msg
});

// 通用 key:真实客户端 IP(经 trust proxy),并暴露给其它模块复用
const ipKey = (req, res) => `ip:${ipKeyGenerator(req, res)}`;
const userKey = (req, res) => (req.user?._id ? `u:${req.user._id}` : ipKey(req, res));
const userOrIpKey = userKey;

// standardHeaders: 'draft-8' → 429 时同时输出 RateLimit 系列头 + Retry-After(秒)
const standardOpts = {
  standardHeaders: 'draft-8',
};

// 浏览器「顶层导航」型路由(第三方登录起跳/回调)的 429 不能回 JSON —— 用户会卡在一屏
// {"success":false,...} 上且没有回登录页的路。统一跳回登录页并沿用笼统错误码
const loginRedirectHandler = (code) => (req, res) => {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  res.redirect(`${base}/login?error=${code}`);
};

// 管理员登录:L4 — 阈值放宽到 10 次/15 分钟,避免 NAT 共享 IP 误伤正常登录;429 带 Retry-After
exports.adminLoginLimiter = rateLimit({
  ...standardOpts,
  windowMs: 15 * minute,
  max: 10,
  keyGenerator: ipKey,
  message: denyMessage('登录尝试过多，请稍后再试')
});

exports.adminTwoFactorLimiter = rateLimit({
  ...standardOpts,
  windowMs: 15 * minute,
  max: 10,
  keyGenerator: ipKey,
  message: denyMessage('验证尝试过多，请稍后再试')
});
// 第三方登录起跳:同一 IP 15 分钟内最多 40 次(正常用户 1-2 次/次登录)
exports.oauthStartLimiter = rateLimit({
  ...standardOpts,
  windowMs: 15 * minute,
  max: 40,
  keyGenerator: ipKey,
  message: denyMessage('登录请求过多，请稍后再试'),
  handler: loginRedirectHandler('oauth_failed')
});

// 第三方登录回调:state 校验能挡住「不带 cookie 的重放」,但攻击者可以拿自己那份合法 state
// 反复触发一次出站换 token 请求,所以同样限速(比正常用户一次登录一次回调紧得多,仍留足余量)
exports.oauthCallbackLimiter = rateLimit({
  ...standardOpts,
  windowMs: 15 * minute,
  max: 20,
  keyGenerator: ipKey,
  message: denyMessage('登录请求过多，请稍后再试'),
  handler: loginRedirectHandler('oauth_failed')
});

// 登录页每次打开都会读一次公开提供方列表 —— 阈值放宽到基本只挡脚本刷
exports.oauthProvidersLimiter = rateLimit({
  ...standardOpts,
  windowMs: 15 * minute,
  max: 120,
  keyGenerator: ipKey,
  message: denyMessage('请求过于频繁，请稍后再试')
});

// 评论:三层 — IP 限制 + 每用户限制 + 慢响应惩罚
exports.commentIpLimiter = rateLimit({
  ...standardOpts,
  windowMs: minute,
  max: 2, // 同一 IP 每分钟最多 2 次评论(即便切换账号)
  keyGenerator: ipKey,
  message: denyMessage('该网络评论请求过多，请稍后再试')
});

exports.commentDailyIpLimiter = rateLimit({
  ...standardOpts,
  windowMs: day,
  max: 50,
  keyGenerator: ipKey,
  message: denyMessage('该网络今日评论次数已达上限')
});

exports.commentCreateLimiter = rateLimit({
  ...standardOpts,
  windowMs: minute,
  max: 2,
  keyGenerator: userOrIpKey,
  message: denyMessage('评论过于频繁，请稍后再试')
});

exports.commentDailyUserLimiter = rateLimit({
  ...standardOpts,
  windowMs: day,
  max: 50,
  keyGenerator: userOrIpKey,
  message: denyMessage('今日评论已达上限')
});

// 渐进式延迟:第 2 次请求开始每次 +500ms,最高 4s
exports.commentSlowDown = slowDown({
  windowMs: minute,
  delayAfter: 1,
  delayMs: (hits) => Math.min(hits * 500, 4000),
  maxDelayMs: 4000,
  keyGenerator: userOrIpKey,
  validate: { delayMs: false }
});

// 点赞:对应分层
exports.likeIpLimiter = rateLimit({
  ...standardOpts,
  windowMs: minute,
  max: 40,
  keyGenerator: ipKey,
  message: denyMessage('该网络点赞请求过多，请稍后再试')
});

exports.likeLimiter = rateLimit({
  ...standardOpts,
  windowMs: minute,
  max: 20,
  keyGenerator: userOrIpKey,
  message: denyMessage('点赞过于频繁，请稍后再试')
});

exports.likeDailyUserLimiter = rateLimit({
  ...standardOpts,
  windowMs: day,
  max: 300,
  keyGenerator: userOrIpKey,
  message: denyMessage('今日点赞已达上限')
});

// 文章操作(仅 admin)
exports.postWriteLimiter = rateLimit({
  ...standardOpts,
  windowMs: minute,
  max: 5,
  keyGenerator: userOrIpKey,
  message: denyMessage('文章操作过于频繁，请稍后再试')
});

module.exports.ipKey = ipKey;
module.exports.userKey = userKey;
