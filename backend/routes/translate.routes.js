// 内容译文端点:GET /api/translate/:sourceType/:sourceId/:field?lang=zh|en
// - 译文已存库 → 直接返回 Translation.text
// - 原文本身就是目标语言 → 不翻译,返回 { text: null, needed: false }
// - 需要翻译但未译 → 同步翻译一次并写入 Translation 集合(后续直接走库)
// 失败回退原文由前端处理;同一个 (sourceType, sourceId, field, lang) 并发只翻译一次
const express = require('express');
const rateLimit = require('express-rate-limit');
const { ipKey } = require('../middleware/rateLimit.middleware');
const mongoose = require('mongoose');
const { translateSingle, detectLang } = require('../services/aiTranslate');
const Translation = require('../models/Translation');

const router = express.Router();

// M2: 翻译接口成本防护 — 未认证公开端点,但每次真实翻译都消耗付费 AI 配额。
// 三层限流:IP 每分钟 + IP 每日硬上限 + 登录账户配额。
const minute = 60 * 1000;
const day = 24 * 60 * minute;
const deny = { success: false, message: '翻译请求过多，请稍后再试' };

const translatorLimiter = rateLimit({
  windowMs: minute,
  max: 30, // 每 IP 每分钟最多 30 次译文读取(单个页面切换语言时评论译文并发很少超此量)
  keyGenerator: ipKey,
  standardHeaders: 'draft-8',
  message: deny,
});
const translateDailyLimiter = rateLimit({
  windowMs: day,
  max: 300, // 每 IP 每日最多 300 次,硬性封顶避免脚本持续烧配额
  keyGenerator: ipKey,
  standardHeaders: 'draft-8',
  message: { success: false, message: '该网络今日翻译次数已达上限' },
});
const translateUserLimiter = rateLimit({
  windowMs: minute,
  max: 20, // 登录用户每分钟最多 20 次(有 token 时按账户 ID 计数,无 token 回落 IP)
  keyGenerator: (req, res) => (req.user?._id ? `u:${req.user._id}` : ipKey(req, res)),
  standardHeaders: 'draft-8',
  message: deny,
});

const TYPES = {
  post: 'Post',
  comment: 'Comment',
  announcement: 'Announcement',
};

// 进行中的翻译,避免同一 (type, id, field, lang) 并发重复翻译
const inflight = new Map();

// 取源文档的原文文本
async function fetchSource(sourceType, sourceId) {
  const Model = require('../models/' + TYPES[sourceType]);
  return Model.findById(sourceId).lean();
}

router.get('/:sourceType/:sourceId/:field', translatorLimiter, translateDailyLimiter, translateUserLimiter, async (req, res) => {
  try {
    const { sourceType, sourceId, field } = req.params;
    // M2: 只支持 zh/en。此前任何非 en 小语种(ja/fr/de/...)都被归一化成 zh,
    // 返回同一份中文译文并浪费翻译配额 — 现在一律 400。
    const lang = req.query.lang;
    if (lang !== 'zh' && lang !== 'en') {
      return res.status(400).json({ success: false, message: 'lang 仅支持 zh / en' });
    }
    
    if (!TYPES[sourceType]) {
      return res.status(400).json({ success: false, message: 'sourceType 仅支持 post / comment / announcement' });
    }
    if (!['title', 'body'].includes(field)) {
      return res.status(400).json({ success: false, message: 'field 仅支持 title / body' });
    }
    if (!mongoose.isValidObjectId(sourceId)) {
      return res.status(400).json({ success: false, message: 'sourceId 无效' });
    }

    const source = await fetchSource(sourceType, sourceId);
    if (!source) {
      return res.status(404).json({ success: false, message: '内容不存在' });
    }

    const key = `${sourceType}:${sourceId}:${field}:${lang}`;
    // 1) 已存库 → 直接返回
    const existing = await Translation.findOne({ sourceType, sourceId, field, lang }).lean();
    if (existing) {
      return res.json({ success: true, text: existing.text, needed: true });
    }

    const original = field === 'title' ? source.title : source.content;
    if (typeof original !== 'string' || !original.trim()) {
      return res.json({ success: true, text: null, needed: false });
    }
    // 2) 原文本身就是目标语言 → 不需要译文
    if (detectLang(original) === lang) {
      return res.json({ success: true, text: null, needed: false });
    }

    // 3) 需要翻译:in-flight 去重,避免并发重复翻译
    if (inflight.has(key)) {
      const text = await inflight.get(key);
      return res.json({ success: true, text, needed: true });
    }
    const job = (async () => {
      const text = await translateSingle(original, lang);
      await Translation.findOneAndUpdate(
        { sourceType, sourceId, field, lang },
        { text },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return text;
    })();
    inflight.set(key, job);
    try {
      const text = await job;
      res.json({ success: true, text, needed: true });
    } finally {
      inflight.delete(key);
    }
  } catch (err) {
    // AI 未启用/调用失败 → 前端回退原文;E11000 重复插入(并发)兜底再查一次
    if (err.code === 11000) {
      try {
        const { sourceType, sourceId, field } = req.params;
        // 走到这里 lang 必为 zh/en(主路径已白名单校验)
        const lang = req.query.lang;
        const dup = await Translation.findOne({ sourceType, sourceId, field, lang }).lean();
        if (dup) return res.json({ success: true, text: dup.text, needed: true });
      } catch (e) { /* ignore */ }
    }
    console.error('[translate] 翻译失败:', err.message); // 具体原因只进日志
    // 502 响应不对客户端暴露 AI 提供方/模型等内部信息;前端捕获后回退原文
    res.status(502).json({ success: false, message: '翻译服务暂时不可用' });
  }
});

module.exports = router;