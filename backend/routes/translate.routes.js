// 内容译文端点:GET /api/translate/:sourceType/:sourceId/:field?lang=zh|en
// - 译文已存库 → 直接返回 Translation.text
// - 原文本身就是目标语言 → 不翻译,返回 { text: null, needed: false }
// - 需要翻译但未译 → 同步翻译一次并写入 Translation 集合(后续直接走库)
// 失败回退原文由前端处理;同一个 (sourceType, sourceId, field, lang) 并发只翻译一次
const express = require('express');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { translateSingle, detectLang } = require('../services/aiTranslate');
const Translation = require('../models/Translation');

const router = express.Router();

const translatorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // 每 IP 每分钟最多 120 次译文读取(含自动翻译),访客切换语言页面刷译也可能并发几条
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '翻译请求过多，请稍后再试' },
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

router.get('/:sourceType/:sourceId/:field', translatorLimiter, async (req, res) => {
  try {
    const { sourceType, sourceId, field } = req.params;
    const lang = req.query.lang === 'en' ? 'en' : 'zh';
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
        const lang = req.query.lang === 'en' ? 'en' : 'zh';
        const dup = await Translation.findOne({ sourceType, sourceId, field, lang }).lean();
        if (dup) return res.json({ success: true, text: dup.text, needed: true });
      } catch (e) { /* ignore */ }
    }
    console.error('[translate] 翻译失败:', err.message);
    res.status(502).json({ success: false, message: err.message || '翻译服务暂时不可用' });
  }
});

module.exports = router;