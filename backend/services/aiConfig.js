// =========================================================
// AI 审核配置(OpenAI 兼容) — 优先级: 后台覆盖(DB) > .env 默认
// 管理员可在后台「AI 设置」面板填写 baseURL / API Key / 模型名,
// 存进 Setting 表('ai.config');「恢复默认」会删掉 DB 覆盖,回退到 .env。
// 保存/恢复即刷新内存配置,无需重启后端。
// =========================================================
const Setting = require('../models/Setting');

const SETTING_KEY = 'ai.config';
const REFRESH_INTERVAL = 30 * 1000; // 兜底定时刷新 DB 覆盖

// 逗号分隔字符串 -> 非空数组
const splitCsv = (s) => String(s || '').split(',').map((v) => v.trim()).filter(Boolean);

// ---- .env 默认值 ----
function buildFromEnv() {
  return {
    enabled: process.env.AI_ENABLED !== 'false',
    baseUrl: (process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    keys: splitCsv(process.env.AI_API_KEYS || process.env.GEMINI_API_KEYS),
    models: splitCsv(process.env.AI_MODELS || 'gpt-4o-mini'),
    proxy: process.env.AI_PROXY || process.env.GEMINI_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''
  };
}

// ---- 合并:DB 里显式设置的字段覆盖 env,空/未设置回退 env ----
function merge(base, db) {
  return {
    enabled: typeof db?.enabled === 'boolean' ? db.enabled : base.enabled,
    baseUrl: db?.baseUrl ? String(db.baseUrl).replace(/\/+$/, '') : base.baseUrl,
    keys: Array.isArray(db?.keys) && db.keys.length ? db.keys : base.keys,
    models: Array.isArray(db?.models) && db.models.length ? db.models : base.models,
    proxy: db?.proxy ? String(db.proxy) : base.proxy
  };
}

let config = buildFromEnv();

async function loadFromDb() {
  const doc = await Setting.findOne({ key: SETTING_KEY }).lean();
  return doc?.value || null;
}

let refreshing = false;
async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    const db = await loadFromDb();
    config = merge(buildFromEnv(), db);
  } catch (err) {
    // DB 暂不可用:保持当前内存配置,不抛错
    console.warn('[aiConfig] 刷新配置失败(保持当前配置):', err.message);
  } finally {
    refreshing = false;
  }
}

// 启动拉起一次 + 定时兜底(后台面板保存时会主动 refresh,这里只防外部改动)
refresh();
setInterval(refresh, REFRESH_INTERVAL).unref?.();

// 同步读取当前生效配置(内存)
function getConfig() {
  return config;
}

// 是否存在 DB 覆盖(用于前端区分来源,显示“恢复默认(.env)”按钮)
async function hasDbOverride() {
  return !!(await Setting.findOne({ key: SETTING_KEY }).lean());
}

// 保存覆盖。patch 里显式给出的字段会持久化并覆盖;未给的回退到当前 DB / env
async function saveConfig(patch = {}) {
  const db = await loadFromDb();
  const merged = {
    enabled: typeof patch.enabled === 'boolean' ? patch.enabled : db?.enabled,
    baseUrl: patch.baseUrl ? String(patch.baseUrl).trim().replace(/\/+$/, '') : db?.baseUrl,
    keys: Array.isArray(patch.keys) ? patch.keys.map((k) => String(k).trim()).filter(Boolean) : db?.keys,
    models: Array.isArray(patch.models) ? patch.models.map((m) => String(m).trim()).filter(Boolean) : db?.models,
    proxy: patch.proxy !== undefined ? String(patch.proxy).trim() : db?.proxy
  };

  // 只持久化有效覆盖字段
  const toStore = {};
  if (typeof merged.enabled === 'boolean') toStore.enabled = merged.enabled;
  if (merged.baseUrl) toStore.baseUrl = merged.baseUrl;
  if (Array.isArray(merged.keys) && merged.keys.length) toStore.keys = merged.keys;
  if (Array.isArray(merged.models) && merged.models.length) toStore.models = merged.models;
  if (merged.proxy) toStore.proxy = merged.proxy;

  if (Object.keys(toStore).length === 0) {
    await Setting.deleteOne({ key: SETTING_KEY });
  } else {
    await Setting.findOneAndUpdate(
      { key: SETTING_KEY },
      { key: SETTING_KEY, value: toStore },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  config = merge(buildFromEnv(), toStore);
  return config;
}

// 删除 DB 覆盖,回退到 .env
async function resetConfig() {
  await Setting.deleteOne({ key: SETTING_KEY });
  config = buildFromEnv();
  return config;
}

module.exports = { getConfig, saveConfig, resetConfig, hasDbOverride, splitCsv, buildFromEnv };
