// 内容翻译端点:POST /api/translate
// 输入 { texts: string[], target: 'zh'|'en' } → 输出译文数组
// 未鉴权可用(访客切换语言也需翻译),靠限频防滥用;失败回退原文由前端处理
const express = require('express');
const rateLimit = require('express-rate-limit');
const { translateBatch } = require('../services/aiTranslate');

const router = express.Router();

const translatorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 每 IP 每分钟最多 30 次翻译请求
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '翻译请求过多，请稍后再试' },
});

router.post('/', translatorLimiter, async (req, res) => {
  try {
    const { texts, target } = req.body || {};
    if (!Array.isArray(texts) || texts.length === 0 || texts.length > 60) {
      return res.status(400).json({ success: false, message: 'texts 需为 1-60 条的字符串数组' });
    }
    if (!['zh', 'en'].includes(target)) {
      return res.status(400).json({ success: false, message: 'target 仅支持 zh / en' });
    }
    for (const item of texts) {
      if (typeof item !== 'string') {
        return res.status(400).json({ success: false, message: 'texts 每项必须是字符串' });
      }
    }
    const translations = await translateBatch(texts, target);
    res.json({ success: true, translations });
  } catch (err) {
    // AI 未启用/调用失败 → 让前端回退原文
    console.error('[translate] 翻译失败:', err.message);
    res.status(502).json({ success: false, message: err.message || '翻译服务暂时不可用' });
  }
});

module.exports = router;