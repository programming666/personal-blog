// 反滥用中间件集合 — 在限流之外再加一层语义/行为校验
const Comment = require('../models/Comment');

const minute = 60 * 1000;
const hour = 60 * minute;

// ---------- 1. Honeypot ----------
// 前端表单里塞一个对用户隐藏的字段 _hp_field; 机器人通常会填充所有 input
exports.honeypotCheck = (req, res, next) => {
  const hp = req.body?._hp_field;
  if (typeof hp === 'string' && hp.trim() !== '') {
    // 假装成功,但不实际入库 — 不告诉机器人它被识破了
    return res.status(200).json({ success: true, data: null });
  }
  if (req.body) delete req.body._hp_field;
  return next();
};

// ---------- 2. Origin/Referer 校验 ----------
const allowedOrigins = (() => {
  const list = [];
  if (process.env.FRONTEND_URL) list.push(process.env.FRONTEND_URL);
  // 本地开发常用入口
  list.push('http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000');
  return list.map((s) => s.replace(/\/$/, ''));
})();

const matchesAllowed = (value) => {
  if (!value) return false;
  try {
    const u = new URL(value);
    const origin = `${u.protocol}//${u.host}`;
    return allowedOrigins.includes(origin);
  } catch {
    return false;
  }
};

exports.checkOrigin = (req, res, next) => {
  // 跨域写操作必须带可信 Origin 或 Referer
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  if (origin && matchesAllowed(origin)) return next();
  if (referer && matchesAllowed(referer)) return next();
  return res.status(403).json({ success: false, message: '请求来源不受信任' });
};

// ---------- 3. 账号年龄 ----------
exports.requireAccountAge = (minSeconds) => (req, res, next) => {
  if (!req.user?.createdAt) {
    return res.status(403).json({ success: false, message: '账户信息异常' });
  }
  // admin 直接放行(env 凭据上来的真实用户)
  if (req.user.role === 'admin') return next();
  const ageMs = Date.now() - new Date(req.user.createdAt).getTime();
  if (ageMs < minSeconds * 1000) {
    return res.status(403).json({
      success: false,
      message: `账号过新，请在注册后 ${minSeconds} 秒再尝试`
    });
  }
  return next();
};

// ---------- 4. 评论正文校验 ----------
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

exports.validateCommentBody = (req, res, next) => {
  let { content } = req.body || {};
  if (typeof content !== 'string') {
    return res.status(400).json({ success: false, message: '评论内容缺失' });
  }
  content = content.trim();
  if (content.length === 0) {
    return res.status(400).json({ success: false, message: '评论内容不能为空' });
  }
  if (content.length > 100) {
    return res.status(400).json({ success: false, message: '评论不能超过 100 个字符' });
  }
  if (CONTROL_CHARS.test(content)) {
    return res.status(400).json({ success: false, message: '评论包含非法字符' });
  }
  // 单字符重复 (例: "啊啊啊啊啊啊啊啊啊啊啊啊...") 是廉价 spam,直接拦
  if (/(.)\1{11,}/.test(content)) {
    return res.status(400).json({ success: false, message: '评论格式异常' });
  }
  // 注:URL 数量、大写字母比例这种语义层判断交给 AI 审核,这里只做最便宜的格式过滤
  req.body.content = content;
  return next();
};

// ---------- 5. 重复评论检测 ----------
// 同用户 1 小时内不能发完全相同的内容;同帖子下 5 分钟内不能再发同内容
exports.detectDuplicateComment = async (req, res, next) => {
  try {
    const { content, post } = req.body;
    const userId = req.user._id;
    const now = Date.now();
    const oneHourAgo = new Date(now - hour);
    const fiveMinAgo = new Date(now - 5 * minute);
    const dup = await Comment.findOne({
      $or: [
        { author: userId, content, createdAt: { $gte: oneHourAgo } },
        { post, content, createdAt: { $gte: fiveMinAgo } }
      ]
    })
      .lean()
      .select('_id');
    if (dup) {
      return res.status(409).json({ success: false, message: '请勿重复评论' });
    }
    return next();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- 6. 点赞反复切换抑制 ----------
// 同 (用户, 目标) 一小时内最多切换 5 次
const toggleStore = new Map(); // key -> [timestamps]
const TOGGLE_WINDOW = hour;
const TOGGLE_MAX = 5;

const cleanupToggles = () => {
  const cutoff = Date.now() - TOGGLE_WINDOW;
  for (const [k, list] of toggleStore) {
    const fresh = list.filter((t) => t > cutoff);
    if (fresh.length === 0) toggleStore.delete(k);
    else toggleStore.set(k, fresh);
  }
};
setInterval(cleanupToggles, 10 * minute).unref?.();

exports.limitLikeToggle = (kind) => (req, res, next) => {
  const targetId = req.params.id;
  const userId = req.user?._id?.toString();
  if (!targetId || !userId) {
    return res.status(400).json({ success: false, message: 'Invalid target' });
  }
  const key = `${kind}:${userId}:${targetId}`;
  const now = Date.now();
  const cutoff = now - TOGGLE_WINDOW;
  const recent = (toggleStore.get(key) || []).filter((t) => t > cutoff);
  if (recent.length >= TOGGLE_MAX) {
    return res.status(429).json({
      success: false,
      message: '点赞切换过于频繁，请稍后再试'
    });
  }
  recent.push(now);
  toggleStore.set(key, recent);
  return next();
};

// ---------- 7. Bot 特征 UA ----------
const BOT_UA = /\b(curl|wget|python-requests|libwww|httpclient|scrapy|httpx|axios\/(?!1)|go-http-client|java\/|okhttp|node-fetch|got\/|aiohttp|phantomjs|headless)\b/i;

exports.blockBotUserAgent = (req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  if (!ua || ua.length < 10) {
    return res.status(403).json({ success: false, message: '不允许的客户端' });
  }
  if (BOT_UA.test(ua)) {
    return res.status(403).json({ success: false, message: '不允许的客户端' });
  }
  return next();
};
