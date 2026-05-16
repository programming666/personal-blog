// Google AI Studio (Gemini) 评论审核服务
// 支持多 key 轮询,(key, model) 各自 RPM=10 RPD=1500
// 配额耗尽 / 调用失败 / 输出无法解析 时返回 'pending',由 queue worker 之后重试
// 支持 SOCKS5 / HTTP 代理(GEMINI_PROXY 或 HTTPS_PROXY 环境变量)
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');

const MODELS = ['gemma-4-31b-it', 'gemma-4-26b-a4b-it'];
const RPM_LIMIT = 10;
const RPD_LIMIT = 1500;
const minute = 60 * 1000;
const day = 24 * 60 * minute;
const REQUEST_TIMEOUT = 30000;

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

const buildPrompt = (text) => `[严格输出要求] 你只能输出一行 JSON,格式: {"allow": true|false, "reason": "<=30字中文"}
禁止任何分析、推理、思考链、bullet 点、markdown 包裹、解释性文字。只要 JSON 这一行,其他都不许有。

你是博客评论审核助手。本博客只允许真人原创、与正文相关的评论。请判断下面这条评论是否应被公开显示。

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

待审核评论:
"""${text}"""

[再次提醒] 只输出一行 JSON: {"allow": bool, "reason": "<=30字,被拒时必须指明AI/机器人/推广哪一类"}`;

// 扫描所有平衡的 {...} 块,尊重字符串/转义
const findJsonObjects = (s) => {
  const results = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      if (depth > 0) {
        depth--;
        if (depth === 0 && start !== -1) {
          results.push(s.slice(start, i + 1));
          start = -1;
        }
      }
    }
  }
  return results;
};

const tryParseVerdict = (s) => {
  try {
    const obj = JSON.parse(s);
    if (typeof obj.allow !== 'boolean') return null;
    return {
      allow: obj.allow,
      reason: String(obj.reason || '').slice(0, 200)
    };
  } catch {
    return null;
  }
};

const extractJson = (raw) => {
  if (!raw) return null;
  // 1) 整段直接解析
  const direct = tryParseVerdict(raw.trim());
  if (direct) return direct;
  // 2) 扫所有平衡的 {...},从右往左尝试 — 最终答案通常在末尾,
  //    前面的 {...} 多半是 prompt 里 echo 的模板或思考链中的伪 JSON
  const candidates = findJsonObjects(raw);
  for (let i = candidates.length - 1; i >= 0; i--) {
    const parsed = tryParseVerdict(candidates[i]);
    if (parsed) return parsed;
  }
  return null;
};

const callGemini = async (slot, text) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${slot.model}:generateContent?key=${encodeURIComponent(slot.key)}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: buildPrompt(text) }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 200,
      // 强制服务端只返回 JSON;不被支持的 model 会忽略此字段,仍由 extractJson 兜底
      response_mime_type: 'application/json',
      response_schema: {
        type: 'object',
        properties: {
          allow: { type: 'boolean' },
          reason: { type: 'string' }
        },
        required: ['allow', 'reason']
      }
    }
  };
  const resp = await axios.post(url, body, {
    timeout: REQUEST_TIMEOUT,
    // 走代理时必须显式禁用 axios 内置 proxy 逻辑,完全交给 agent 接管
    ...(proxyAgent ? { httpAgent: proxyAgent, httpsAgent: proxyAgent, proxy: false } : {})
  });
  const out = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return out;
};

// 出于安全考虑只展示 key 的前 6 字符 + 末 4 字符,中间用 *** 代替 — 足够定位是哪一个,又不会在日志泄漏完整 key
const maskKey = (k) => {
  if (!k) return '<no-key>';
  if (k.length <= 12) return `${k.slice(0, 2)}***${k.slice(-2)}`;
  return `${k.slice(0, 6)}***${k.slice(-4)}`;
};

// 代理 agent — 在模块加载时解析一次,避免每次请求重建;支持:
//   socks5://user:pass@host:1080  / socks5h://host:1080  / socks://host:1080
//   http://user:pass@host:8080    / https://host:8080
// 环境变量优先级:GEMINI_PROXY > HTTPS_PROXY > HTTP_PROXY > 无代理
const getProxyUrl = () => process.env.GEMINI_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

const buildProxyAgent = () => {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) return null;
  let parsed;
  try {
    parsed = new URL(proxyUrl);
  } catch {
    console.warn(`[aiModeration] 代理 URL 无法解析,已忽略: ${proxyUrl}`);
    return null;
  }
  const scheme = parsed.protocol.replace(':', '').toLowerCase();
  try {
    if (scheme.startsWith('socks')) {
      return new SocksProxyAgent(proxyUrl);
    }
    if (scheme === 'http' || scheme === 'https') {
      return new HttpsProxyAgent(proxyUrl);
    }
  } catch (err) {
    console.warn(`[aiModeration] 构建代理 agent 失败 (${scheme}): ${err.message}`);
    return null;
  }
  console.warn(`[aiModeration] 不支持的代理协议: ${scheme} (仅支持 socks/socks5/http/https)`);
  return null;
};

const proxyAgent = buildProxyAgent();
if (proxyAgent) {
  // 打印时同样脱敏密码部分
  const masked = (() => {
    try {
      const u = new URL(getProxyUrl());
      if (u.password) u.password = '***';
      if (u.username) u.username = u.username.slice(0, 2) + '***';
      return u.toString();
    } catch {
      return '<set>';
    }
  })();
  console.log(`[aiModeration] 使用代理: ${masked}`);
}

// returns { status: 'approved'|'rejected'|'pending', reason?, model?, keyIdx? }
// 'pending' 表示 AI 暂时不可用(配额满 / 调用失败 / 输出无法解析),由 queue worker 之后重试
exports.moderateComment = async (text) => {
  if (getKeys().length === 0) {
    // 未配置 key 时:审核停用,默认放行(但所有其他防御层仍生效)
    return { status: 'approved', reason: 'moderation disabled (no GEMINI_API_KEYS)' };
  }
  const slot = pickSlot();
  if (!slot) {
    return { status: 'pending', reason: '审核 API 当前已满载' };
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
      console.warn('[aiModeration] unparseable output', {
        keyIdx: slot.keyIdx,
        key: maskKey(slot.key),
        model: slot.model,
        rawOutput: raw
      });
      return { status: 'pending', reason: 'AI 输出格式异常', model: slot.model, keyIdx: slot.keyIdx };
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
    const rawOutput = err.response?.data ? JSON.stringify(err.response.data).slice(0, 500) : undefined;
    // 429/503 等上游限流 — 标记 pending,worker 稍后重试
    console.error('[aiModeration] call failed', {
      keyIdx: slot.keyIdx,
      key: maskKey(slot.key),
      model: slot.model,
      code,
      detail,
      rawOutput
    });
    return {
      status: 'pending',
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
