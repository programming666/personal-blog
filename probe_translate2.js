// probe2:完全复刻 aiTranslate.callOnce 的请求(含 response_format + 同款 system prompt),定位 401
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const axios = require('axios');
const { getConfig } = require('./services/aiConfig');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  await new Promise((r) => setTimeout(r, 33000)); // 等 30s 定时 refresh 完成
  const cfg = await getConfig();
  console.log('env AI_BASE_URL?', JSON.stringify(process.env.AI_BASE_URL || '(unset)'));
  console.log('cfg.baseUrl:', cfg.baseUrl, '| model:', JSON.stringify(cfg.models), '| keys:', cfg.keys.map((k) => k.slice(0, 8) + '…'));

  const url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const target = 'en';
  const system = `你是网页内容翻译引擎。请把用户提供的每个文本片段都翻译成英文。
要求:
1. 保持原文语义、语气与细节;保留 Markdown 语法结构(标题、代码块、链接、列表等原样保留,只翻译其中的文字)。
2. 技术术语可保留英文原文;专有名词(人名、产品名、域名)不翻译。
3. 若文本本身就是目标语言或纯代码/符号,原样返回,不要改动。
4. 输出与输入一一对应,条数完全一致,不得合并或拆分。
[严格输出格式] 只输出一行 JSON,结构: {"translations": ["...", "..."]}
禁止任何其他文字、解释、markdown 包裹,只要这一行 JSON。`;
  const body = {
    model: cfg.models && cfg.models.length ? cfg.models[0] : cfg.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(['你好，世界']) },
    ],
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  };
  try {
    const resp = await axios.post(url, body, {
      headers: { Authorization: 'Bearer ' + cfg.keys[0], 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    console.log('OK:', JSON.stringify(resp.data).slice(0, 400));
  } catch (e) {
    console.log('FAIL status:', e.response ? e.response.status : e.code);
    console.log('FAIL body:', JSON.stringify(e.response ? e.response.data : e.message).slice(0, 500));
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });