// =========================================================
// 中英内容翻译服务(复用 AI 审核的配置与通道)
// - 配置来源: services/aiConfig(.env 默认 + 后台面板 DB 覆盖)
// - 调用任意 OpenAI 兼容 /chat/completions 端点
// - 输入: 文本数组;输出: 一一对应的译文数组
// - 简单节流 + 分块,防打爆每 (key, model) 的 RPM 配额
// 失败时调用方应回退展示原文(渐进增强,翻译不是硬依赖)
// =========================================================
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { getConfig } = require('./aiConfig');

const REQUEST_TIMEOUT = 60000;
// 每块最多字符数与条数(长文自动分块,避免单次超 max_tokens)
const CHUNK_CHARS = 6000;
const CHUNK_ITEMS = 20;

// 全局节流:两次翻译调用至少间隔这么久(个人博客低并发场景足够)
const MIN_GAP_MS = 1500;
let lastCallAt = 0;

const agentCache = new Map();

function getProxyAgent(proxyUrl) {
  if (!proxyUrl) return null;
  if (agentCache.has(proxyUrl)) return agentCache.get(proxyUrl);
  let agent = null;
  try {
    const parsed = new URL(proxyUrl);
    const scheme = parsed.protocol.replace(':', '');
    if (scheme.startsWith('socks')) agent = new SocksProxyAgent(proxyUrl);
    else if (scheme === 'http' || scheme === 'https') agent = new HttpsProxyAgent(proxyUrl);
  } catch {
    console.warn(`[aiTranslate] 代理 URL 无法解析,已忽略: ${proxyUrl}`);
  }
  agentCache.set(proxyUrl, agent);
  return agent;
}

const buildSystemPrompt = (target) =>
  `你是网页内容翻译引擎。请把用户提供的每个文本片段都翻译成${target === 'en' ? '英文' : '简体中文'}。
要求:
1. 保持原文语义、语气与细节;保留 Markdown 语法结构(标题、代码块、链接、列表等原样保留,只翻译其中的文字)。
2. 技术术语可保留英文原文;专有名词(人名、产品名、域名)不翻译。
3. 若文本本身就是目标语言或纯代码/符号,原样返回,不要改动。
4. 输出与输入一一对应,条数完全一致,不得合并或拆分。
[严格输出格式] 只输出一行 JSON,结构: {"translations": ["...", "..."]}
禁止任何其他文字、解释、markdown 包裹,只要这一行 JSON。`;

// 从模型输出中提取第一个完整 JSON 对象(容忍 thinking 前缀 / markdown 代码块包裹)
function extractJson(s) {
  const start = s.indexOf('{');
  if (start === -1) throw new Error('模型中未包含 JSON 输出');
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  throw new Error('JSON 括号不匹配');
}

async function callOnce({ baseUrl, key, model, proxyUrl, texts, target }) {
  const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const body = {
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt(target) },
      { role: 'user', content: JSON.stringify(texts) },
    ],
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  };
  const agent = getProxyAgent(proxyUrl);
  const resp = await axios.post(url, body, {
    timeout: REQUEST_TIMEOUT,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    ...(agent ? { httpAgent: agent, httpsAgent: agent, proxy: false } : {}),
  });
  const raw = resp.data?.choices?.[0]?.message?.content || '';
  // MiniMax 等模型可能在 JSON 前输出 thinking/说明前缀:扫描平衡括号取第一个完整 JSON 对象
  const sliced = extractJson(raw);
  const parsed = JSON.parse(sliced);
  if (!Array.isArray(parsed.translations) || parsed.translations.length !== texts.length) {
    throw new Error('翻译输出条数与输入不一致');
  }
  return parsed.translations.map((s) => (typeof s === 'string' ? s : String(s)));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 批量翻译文本数组。
 * @param {string[]} texts 待翻译文本(单条≤8000字符)
 * @param {'zh'|'en'} target 目标语言
 * @returns {Promise<string[]>} 与输入一一对应的译文
 */
async function translateBatch(texts, target) {
  const cfg = await getConfig();
  if (!cfg.enabled || !Array.isArray(cfg.keys) || cfg.keys.length === 0) {
    throw new Error('AI 未启用或未配置 key');
  }
  const baseUrl = cfg.baseUrl;
  const key = cfg.keys[0]; // 翻译走第一个 key(与审核共享同一个池,但低频)
  const model = (cfg.models && cfg.models.length ? cfg.models[0] : cfg.model) || cfg.model;
  const proxyUrl = cfg.proxy || '';

  // 分块
  const chunks = [];
  let cur = { items: [], chars: 0 };
  for (const text of texts) {
    const s = typeof text === 'string' ? text : '';
    if (cur.items.length >= CHUNK_ITEMS || (cur.chars + s.length > CHUNK_CHARS && cur.items.length > 0)) {
      chunks.push(cur.items);
      cur = { items: [], chars: 0 };
    }
    cur.items.push(s);
    cur.chars += s.length;
  }
  if (cur.items.length > 0) chunks.push(cur.items);

  const out = [];
  for (const chunk of chunks) {
    const gap = MIN_GAP_MS - (Date.now() - lastCallAt);
    if (gap > 0) await sleep(gap);
    lastCallAt = Date.now();
    const translated = await callOnce({ baseUrl, key, model, proxyUrl, texts: chunk, target });
    out.push(...translated);
  }
  return out;
}
const CJK_RE = /[\u4e00-\u9fff]/;

/**
 * 判定文本语言:含中文字符视为中文,否则视为英文(粗筛,用于判断『是否需要翻译』)。
 * @param {string} text
 * @returns {'zh'|'en'}
 */
function detectLang(text) {
  const s = typeof text === 'string' ? text : '';
  return CJK_RE.test(s) ? 'zh' : 'en';
}

/**
 * 翻译单条文本(译文持久化到 Translation 集合前调用)。
 * @param {string} text
 * @param {'zh'|'en'} target
 * @returns {Promise<string>}
 */
async function translateSingle(text, target) {
  const [out] = await translateBatch([text], target);
  return out;
}

module.exports = { translateBatch, translateSingle, detectLang };