// =========================================================
// OpenAI 兼容 评论审核服务
// 请求任意 OpenAI 兼容的 /chat/completions 端点
// (OpenAI / DeepSeek / Moonshot / OpenRouter / SiliconFlow / 本地 Ollama...),
// 兼容写法与 Google AI Studio 原生 API 不同,其余逻辑(多 key 轮询、
// RPM/RPD 配额滑动窗口、三态裁决、pending 重试队列)原样保留。
// 配置来源: services/aiConfig — .env 默认 + 后台面板(DB)覆盖。
// =========================================================
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { getConfig } = require('./aiConfig');

const minute = 60 * 1000;
const day = 24 * 60 * minute;
const REQUEST_TIMEOUT = 30000;

// ---------- 审核 Prompt ----------
// system:转给模型的系统指令(严格 JSON + 分类规则);user:待审评论
const SYSTEM_PROMPT = `你是博客评论审核助手。本博客只允许真人原创、与正文相关的评论。请判断下面这条评论是否应被公开显示。

[严格输出要求] 你只能输出一行 JSON,格式: {"allow": true|false, "reason": "<=30字中文", "tone": "friendly"|"unfriendly", "rewritten": ""}
allow 表示是否放行展示;tone 表示语气是否友好;rewritten 仅在 tone=unfriendly 且内容有实质价值时填写保留原意的友善重写版,其余情况一律为空字符串 "".
禁止任何分析、推理、思考链、bullet 点、markdown 包裹、解释性文字。只要 JSON 这一行,其他都不许有。

【应拒绝 allow=false】只要符合以下任意一项即拒:

1. **AI 生成内容** — 典型特征:
   - 过度规整结构,如"首先...其次...最后"、"总而言之"、"综上所述"
   - 模板化套话、空洞的客气语("您说得非常有道理"、"这篇文章写得非常深入")
   - 完美但毫无个人语气的措辞、清一色书面语、无情绪/无口语化片段
   - 明显的 LLM 自我暴露("作为一个 AI"、"作为大语言模型"、"我没有实际经验,但...")
   - 对正文几乎不涉及具体细节的泛泛总结/复述

2. **机器人/灌水内容** — 典型特征:
   - 与文章主题完全无关(请对照用户消息中提供的「相关文章」段落;若未提供则以常识判断)
   - 无意义字符或乱码、随机词堆叠
   - 极短且无信息量的赞美("好文章"、"学到了"、"支持一下"、"沙发"、"顶")作为唯一内容
   - 机械重复、刷屏式语句

3. **推广/营销内容** — 典型特征:
   - 商业链接(电商、引流落地页、来路不明的短链)
   - 产品/服务/课程/付费社群推荐
   - 联系方式引流("加我微信 xxx"、"访问 www.xxx"、"私信我")
   - SEO 关键词堆砌、外链建设话术
   - 与正文不相关的品牌、平台名推广

4. **纯恶意/无实质的阴阳怪气或攻击** — 内容本身不带任何有效观点,只由以下构成:
   - 嘲讽、挖苦、抬杠("就这?"、"这也配叫技术文章?")
   - 人身攻击、贬低、谩骂;居高临下地贬低作者能力

【语气处理】当内容有实质价值(观点/问题/经验),但语气不友善时,不要直接拒绝:
1. **阴阳怪气/不友善的典型特征**:
   - 反讽、明褒暗贬("真厉害啊,结论全靠猜"、"不愧是您呢🙃")
   - 连珠炮式反问、居高临下的说教("这都不懂?"、"麻烦先搞清楚再写")
   - 以问句/奉承开头但夹带贬损的被动攻击
   - 人身攻击倾向、贬低对方智力或水平
2. **处理原则**:
   - 有实质观点但语气不友善 → **allow=true, tone="unfriendly"**,并在 rewritten 中给出保留原意的友善重写版(≤100字,中文,去掉嘲讽换成平实表述和直接语气,保留技术观点/问题本身);reason 注明如"语气不友善,已重写"
   - 完全是攻击互怼、无任何实质信息 → allow=false,直接拒绝

【应允许】只要是真人对正文有具体回应,且语气友善或可接受,均放行:
- 表达观点、质疑、反驳作者(措辞直接但不构成攻击)
- 提具体问题、补充经验、举反例
- 即使简短,只要带具体指向("第三段那个公式我推导不出来,能展开吗?"、"我前年也遇到一样的问题,后来用 X 解决了")
- 口语化、错别字、带情绪、不完美的语法 — 这些反而是真人特征
- 评论中带 1~2 个相关技术链接(如 RFC、文档、源码)用于延伸讨论

[再次提醒] 只输出一行 JSON: {"allow": bool, "reason": "<=30字,被拒时必须指明AI/机器人/推广/恶意哪一类", "tone": "friendly"|"unfriendly", "rewritten": "重写版或空串"}`;
// 正文上下文上限 — 传给模型的文章截断长度(够判断离题即可,避免 token 浪费)
const ARTICLE_CONTEXT_LIMIT = 4000;

const buildUserPrompt = (text, article) => {
  const parts = [];
  if (article && (article.title || article.content)) {
    const title = String(article.title || '').trim() || '未命名文章';
    const content = String(article.content || '').trim();
    const excerpt = content.length > ARTICLE_CONTEXT_LIMIT
      ? content.slice(0, ARTICLE_CONTEXT_LIMIT) + '\n…(正文过长已截断)'
      : content;
    parts.push(`相关文章(用于判断评论是否离题):\n《${title}》\n${excerpt}`);
  }
  parts.push(`待审核评论:\n"""${text}"""`);
  return parts.join('\n\n---\n\n');
};

// ---------- 配额追踪: Map<`${keyIdx}:${model}`, { minuteWindow, dayWindow }> ----------
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

// 找一个还有 RPM 且 RPD 最小的 slot — 均匀分散负载到各 key×model
const pickSlot = () => {
  const cfg = getConfig();
  if (!cfg.enabled || cfg.keys.length === 0 || cfg.models.length === 0) return null;
  const now = Date.now();
  const rpm = cfg.rpm || 10;
  const rpd = cfg.rpd || 1500;
  let best = null;
  for (let i = 0; i < cfg.keys.length; i++) {
    for (const model of cfg.models) {
      const q = getQ(i, model);
      cleanQ(q, now);
      if (q.minuteWindow.length >= rpm) continue;
      if (q.dayWindow.length >= rpd) continue;
      const score = q.dayWindow.length + q.minuteWindow.length * 0.01;
      if (!best || score < best.score) {
        best = { keyIdx: i, key: cfg.keys[i], model, q, score };
      }
    }
  }
  return best;
};

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
      reason: String(obj.reason || '').slice(0, 200),
      tone: obj.tone === 'unfriendly' ? 'unfriendly' : 'friendly',
      rewritten: String(obj.rewritten || '').trim().slice(0, 500)
    };
  } catch {
    return null;
  }
};

const extractJson = (raw) => {
  if (!raw) return null;
  const direct = tryParseVerdict(raw.trim());
  if (direct) return direct;
  const candidates = findJsonObjects(raw);
  for (let i = candidates.length - 1; i >= 0; i--) {
    const parsed = tryParseVerdict(candidates[i]);
    if (parsed) return parsed;
  }
  return null;
};

// ---------- 代理 agent — 按代理 URL 缓存,避免每次请求重建 ----------
const agentCache = new Map();
const getProxyAgent = (proxyUrl) => {
  if (!proxyUrl) return null;
  if (agentCache.has(proxyUrl)) return agentCache.get(proxyUrl);
  let agent = null;
  try {
    const parsed = new URL(proxyUrl);
    const scheme = parsed.protocol.replace(':', '').toLowerCase();
    if (scheme.startsWith('socks')) agent = new SocksProxyAgent(proxyUrl);
    else if (scheme === 'http' || scheme === 'https') agent = new HttpsProxyAgent(proxyUrl);
    else console.warn(`[aiModeration] 不支持的代理协议: ${scheme} (仅支持 socks/socks5/http/https)`);
  } catch {
    console.warn(`[aiModeration] 代理 URL 无法解析,已忽略: ${proxyUrl}`);
  }
  agentCache.set(proxyUrl, agent);
  return agent;
};

const doCall = async ({ baseUrl, key, model, proxyUrl, text, article }) => {
  const url = `${baseUrl}/chat/completions`;
  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(text, article) }
    ],
    temperature: 0,
    max_tokens: 300,
    response_format: { type: 'json_object' }
  };
  const agent = getProxyAgent(proxyUrl);
  const resp = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    timeout: REQUEST_TIMEOUT,
    // 走代理时显式禁用 axios 内置 proxy 逻辑,完全交给 agent 接管
    ...(agent ? { httpAgent: agent, httpsAgent: agent, proxy: false } : {})
  });
  return resp.data?.choices?.[0]?.message?.content || '';
};

// 用当前生效配置发起一次审核请求
const callSlot = (slot, text, article) => {
  const cfg = getConfig();
  return doCall({ baseUrl: cfg.baseUrl, key: slot.key, model: slot.model, proxyUrl: cfg.proxy, text, article });
};

// 出于安全只展示 key 前 6 字符 + 末 4 字符,中间用 *** 代替
const maskKey = (k) => {
  if (!k) return '<no-key>';
  if (k.length <= 12) return `${k.slice(0, 2)}***${k.slice(-2)}`;
  return `${k.slice(0, 6)}***${k.slice(-4)}`;
};

// returns { status: 'approved'|'rejected'|'pending', reason?, model?, keyIdx? }
// 'pending' 表示 AI 暂时不可用(配额满 / 调用失败 / 输出无法解析),由 queue worker 之后重试
exports.moderateComment = async (text, opts = {}) => {
  const cfg = getConfig();
  if (!cfg.enabled) {
    // 审核整体停用(用户主动关闭 AI 审核):默认放行(但其他所有防御层仍生效)
    return { status: 'approved', reason: 'moderation disabled (AI_ENABLED=false)' };
  }
  if (cfg.keys.length === 0 || cfg.models.length === 0) {
    // AI 审核已启用但配置不完整:绝不能未审批直接放行 —— 挂 pending 进队列,
    // 等管理员在面板配好 baseURL/Key/模型后,队列 worker 会自动重审通过
    return { status: 'pending', reason: 'AI 审核已启用但缺少 API Key/模型配置,等待管理员配置', retryable: true };
  }
  const slot = pickSlot();
  if (!slot) {
    return { status: 'pending', reason: '审核 API 当前已满载', quota: true };
  }
  // 先扣配额,无论调用结果 — 避免失败时无限消耗
  const now = Date.now();
  slot.q.minuteWindow.push(now);
  slot.q.dayWindow.push(now);

  try {
    const raw = await callSlot(slot, text, opts.article);
    const verdict = extractJson(raw);
    if (!verdict) {
      console.warn('[aiModeration] unparseable output', {
        keyIdx: slot.keyIdx, key: maskKey(slot.key), model: slot.model, rawOutput: raw
      });
      return { status: 'pending', reason: 'AI 输出格式异常', model: slot.model, keyIdx: slot.keyIdx, retryable: true };
    }
    return { status: verdict.allow ? 'approved' : 'rejected', reason: verdict.reason, model: slot.model, keyIdx: slot.keyIdx, tone: verdict.tone, rewritten: verdict.rewritten };
  } catch (err) {
    const code = err.response?.status;
    const detail = err.response?.data?.error?.message || err.message || 'unknown';
    console.error('[aiModeration] call failed', {
      keyIdx: slot.keyIdx, key: maskKey(slot.key), model: slot.model, code, detail
    });
    return { status: 'pending', reason: `调用失败(${code || 'ERR'}): ${String(detail).slice(0, 100)}`, model: slot.model, keyIdx: slot.keyIdx, retryable: true };
  }
};

exports.hasCapacity = () => pickSlot() !== null;

exports.getQuotaSnapshot = () => {
  const cfg = getConfig();
  const now = Date.now();
  const rpm = cfg.rpm || 10;
  const rpd = cfg.rpd || 1500;
  const snap = [];
  for (let i = 0; i < cfg.keys.length; i++) {
    for (const model of cfg.models) {
      const q = getQ(i, model);
      cleanQ(q, now);
      snap.push({
        keyIdx: i, model,
        rpmUsed: q.minuteWindow.length, rpmLimit: rpm,
        rpdUsed: q.dayWindow.length, rpdLimit: rpd
      });
    }
  }
  return snap;
};
// 把 AI 裁决落到 Comment 文档上(含语气重写逻辑)。
// 重写仅当: 裁决放行 + 模型给出非空 rewritten + 与原文不同。重写内容截断到 schema 上限 100 字。
exports.applyVerdictToComment = (comment, verdict = {}, originalText = '') => {
  comment.moderationStatus = verdict.status;
  comment.moderationReason = verdict.reason || '';
  comment.moderationModel = verdict.model || '';
  // 拿到终态裁决(AI 或管理员)后,重试计数清零
  comment.moderationRetries = 0;

  // 先复位,再按新裁决决定是否重写(re-moderation 时旧的重写标记必须清掉)
  comment.isRewritten = false;
  comment.originalContent = '';
  const original = String(originalText).trim();
  const rewritten = String(verdict.rewritten || '').trim();
  if (verdict.status === 'approved' && rewritten && rewritten !== original) {
    comment.isRewritten = true;
    comment.originalContent = original.slice(0, 100);
    comment.content = rewritten.slice(0, 100);
  }
  return comment;
};

// 测试连接: 用给定的临时配置(不落库)对一条样本评论做一次调用,返回连通性与裁决
exports.testConnection = async (cfg) => {
  const baseUrl = (cfg.baseUrl || '').replace(/\/+$/, '');
  const key = (cfg.keys || [])[0];
  const model = (cfg.models || [])[0];
  if (!baseUrl || !key || !model) {
    return { ok: false, message: '请填写 baseURL、API Key 和模型名后再测试' };
  }
  try {
    const raw = await doCall({
      baseUrl, key, model,
      proxyUrl: cfg.proxy || '',
      text: '这是一条用于测试连接的人工评论：你好，这篇文章写得很清楚，我学到了不少。'
    });
    const verdict = extractJson(raw);
    return { ok: true, model, verdict, raw: (raw || '').slice(0, 300) };
  } catch (err) {
    const code = err.response?.status;
    const detail = err.response?.data?.error?.message || err.message || 'unknown';
    return { ok: false, message: `调用失败(${code || 'ERR'}): ${String(detail).slice(0, 300)}` };
  }
};
