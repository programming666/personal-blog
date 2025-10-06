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

const ipKey = (req, res) => `ip:${ipKeyGenerator(req, res)}`;
const userKey = (req, res) => (req.user?._id ? `u:${req.user._id}` : ipKey(req, res));
const userOrIpKey = userKey;

const standardOpts = {
  standardHeaders: true,
  legacyHeaders: false
};

// 管理员登录:严格 IP 限流
exports.adminLoginLimiter = rateLimit({
  ...standardOpts,
  windowMs: minute,
  max: 3,
  keyGenerator: ipKey,
  message: denyMessage('登录尝试过多，请稍后再试')
});

exports.adminTwoFactorLimiter = rateLimit({
  ...standardOpts,
  windowMs: minute,
  max: 5,
  keyGenerator: ipKey,
  message: denyMessage('验证尝试过多，请稍后再试')
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
