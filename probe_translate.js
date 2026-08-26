// 服务器端探针:检查 aiConfig 实际值 + 复现翻译调用并打印完整错误详情
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { getConfig } = require('./services/aiConfig');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  await new Promise((r) => setTimeout(r, 4000)); // 等配置刷新
  const cfg = await getConfig();
  console.log('=== aiConfig ===');
  console.log('enabled:', cfg.enabled);
  console.log('baseUrl:', cfg.baseUrl);
  console.log('models:', JSON.stringify(cfg.models));
  console.log('keys:', cfg.keys.map((k) => (k ? k.slice(0, 8) + '…(' + k.length + ')' : k)));
  console.log('proxy:', JSON.stringify(cfg.proxy));

  // 尝试用 keys[0]+models[0] 发一次 chat/completions,打印完整错误
  const axios = require('axios');
  const url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const body = {
    model: cfg.models && cfg.models.length ? cfg.models[0] : cfg.model,
    messages: [
      { role: 'system', content: 'translate to english, output json' },
      { role: 'user', content: JSON.stringify(['你好']) },
    ],
    max_tokens: 128,
  };
  for (let i = 0; i < cfg.keys.length; i++) {
    const key = cfg.keys[i];
    try {
      const resp = await axios.post(url, body, {
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        timeout: 30000,
      });
      console.log(`\nkey#${i} OK:`, JSON.stringify(resp.data).slice(0, 300));
    } catch (e) {
      console.log(`\nkey#${i} FAIL (${e.response ? e.response.status : e.code}):`, JSON.stringify(e.response ? e.response.data : e.message).slice(0, 400));
    }
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });