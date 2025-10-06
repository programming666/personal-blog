// Google AI Studio (Gemini) 评论审核服务
// 支持多 key 轮询,(key, model) 各自 RPM=10 RPD=1500
// 配额耗尽时返回 'queued',由 queue worker 之后重试
const axios = require('axios');

const MODELS = ['gemma-4-31b-it', 'gemma-4-26b-a4b-it'];
const RPM_LIMIT = 10;
const RPD_LIMIT = 1500;
const minute = 60 * 1000;
const day = 24 * 60 * minute;
const REQUEST_TIMEOUT = 8000;

const getKeys = () => {
  const raw = process.env.GEMINI_API_KEYS || process.env.GOOGLE_AI_KEYS || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

// quota tracker: Map<`${keyIdx}:${model}`, { minuteWindow: number[], dayWindow: number[] }>
const quotas = new Map();
const getQ = (keyIdx, model) => {
  const k = `${keyIdx}:${model}`;
  let q = quotas.get(k);
  if (!q) {
    q = { minuteWindow: [], dayWindow: [] };
    quotas.set(k, q);
  }
  return q;
};
const cleanQ = (q, now) => {
  q.minuteWindow = q.minuteWindow.filter((t) => t > now - minute);
  q.dayWindow = q.dayWindow.filter((t) => t > now - day);
};

// 找一个还有 RPM 且 RPD 最小的 slot — 均匀分散负载到各 key
const pickSlot = () => {
  const keys = getKeys();
  if (keys.length === 0) return null;
  const now = Date.now();
  let best = null;
  for (let i = 0; i < keys.length; i++) {
    for (const model of MODELS) {
      const q = getQ(i, model);
      cleanQ(q, now);
      if (q.minuteWindow.length >= RPM_LIMIT) continue;
      if (q.dayWindow.length >= RPD_LIMIT) continue;
      const score = q.dayWindow.length + q.minuteWindow.length * 0.01;
      if (!best || score < best.score) {
        best = { keyIdx: i, key: keys[i], model, q, score };
      }
    }
  }
  return best;
};

const buildPrompt = (text) => `你是博客评论审核助手。本博客只允许真人原创、与正文相关的评论。请判断下面这条评论是否应被公开显示。

【应拒绝】只要符合以下任意一项即拒:

1. **AI 生成内容** — 典型特征:
   - 过度规整结构,如"首先...其次...最后"、"总而言之"、"综上所述"
   - 模板化套话、空洞的客气语("您说得非常有道理"、"这篇文章写得非常深入")
   - 完美但毫无个人语气的措辞、清一色书面语、无情绪/无口语化片段
   - 明显的 LLM 自我暴露("作为一个 AI"、"作为大语言模型"、"我没有实际经验,但...")
   - 对正文几乎不涉及具体细节的泛泛总结/复述

2. **机器人/灌水内容** — 典型特征:
   - 与文章主题完全无关
   - 无意义字符或乱码、随机词堆叠
   - 极短且无信息量的赞美("好文章"、"学到了"、"支持一下"、"沙发"、"顶")作为唯一内容
   - 机械重复、刷屏式语句

3. **推广/营销内容** — 典型特征:
   - 商业链接(电商、引流落地页、来路不明的短链)
   - 产品/服务/课程/付费社群推荐
   - 联系方式引流("加我微信 xxx"、"访问 www.xxx"、"私信我")
   - SEO 关键词堆砌、外链建设话术
   - 与正文不相关的品牌、平台名推广

【应允许】只要是真人对正文有具体回应,均放行:
- 表达观点、质疑、反驳作者(措辞激烈但不构成攻击也可以)
- 提具体问题、补充经验、举反例
- 即使简短,只要带具体指向("第三段那个公式我推导不出来,能展开吗?"、"我前年也遇到一样的问题,后来用 X 解决了")
- 口语化、错别字、带情绪、不完美的语法 — 这些反而是真人特征
- 评论中带 1~2 个相关技术链接(如 RFC、文档、源码)用于延伸讨论

【输出格式】严格仅输出一行 JSON,不要 markdown 包裹,不要任何解释:
{"allow": true 或 false, "reason": "<=30字中文,被拒时必须指明AI/机器人/推广哪一类"}

待审核评论:
"""${text}"""`;

const extractJson = (raw) => {
  if (!raw) return null;
  const a = raw.indexOf('{');
  const b = raw.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    const obj = JSON.parse(raw.slice(a, b + 1));
    if (typeof obj.allow !== 'boolean') return null;
    return {
      allow: obj.allow,
      reason: String(obj.reason || '').slice(0, 200)
    };
  } catch {
    return null;
  }
};

const callGemini = async (slot, text) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${slot.model}:generateContent?key=${encodeURIComponent(slot.key)}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: buildPrompt(text) }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 80 }
  };
  const resp = await axios.post(url, body, { timeout: REQUEST_TIMEOUT });
  const out = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return out;
};

// returns { status: 'approved'|'rejected'|'queued', reason?, model?, keyIdx? }
exports.moderateComment = async (text) => {
  if (getKeys().length === 0) {
    // 未配置 key 时:审核停用,默认放行(但所有其他防御层仍生效)
    return { status: 'approved', reason: 'moderation disabled (no GEMINI_API_KEYS)' };
  }
  const slot = pickSlot();
  if (!slot) {
    return { status: 'queued', reason: '审核 API 当前已满载' };
  }
  // 先扣配额,无论调用结果 — 避免失败时无限消耗
  const now = Date.now();
  slot.q.minuteWindow.push(now);
  slot.q.dayWindow.push(now);

  try {
    const raw = await callGemini(slot, text);
    const verdict = extractJson(raw);
    if (!verdict) {
      // 模型输出无法解析 — 进队列,人工/重试
      return { status: 'queued', reason: 'AI 输出格式异常', model: slot.model, keyIdx: slot.keyIdx };
    }
    return {
      status: verdict.allow ? 'approved' : 'rejected',
      reason: verdict.reason,
      model: slot.model,
      keyIdx: slot.keyIdx
    };
  } catch (err) {
    const code = err.response?.status;
    const detail = err.response?.data?.error?.message || err.message || 'unknown';
    // 429/503 等上游限流 — 标记 queued,worker 稍后重试
    return {
      status: 'queued',
      reason: `调用失败(${code || 'ERR'}): ${String(detail).slice(0, 100)}`,
      model: slot.model,
      keyIdx: slot.keyIdx
    };
  }
};

exports.hasCapacity = () => pickSlot() !== null;

exports.getQuotaSnapshot = () => {
  const keys = getKeys();
  const now = Date.now();
  const snap = [];
  for (let i = 0; i < keys.length; i++) {
    for (const model of MODELS) {
      const q = getQ(i, model);
      cleanQ(q, now);
      snap.push({
        keyIdx: i,
        model,
        rpmUsed: q.minuteWindow.length,
        rpmLimit: RPM_LIMIT,
        rpdUsed: q.dayWindow.length,
        rpdLimit: RPD_LIMIT
      });
    }
  }
  return snap;
};
