// probe3:直接调用 app 的 aiTranslate.translateBatch,打印完整错误(含响应体)
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { translateBatch } = require('./services/aiTranslate');
const { getConfig } = require('./services/aiConfig');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  await new Promise((r) => setTimeout(r, 1000));
  console.log('内存 cfg:', JSON.stringify(getConfig().baseUrl), JSON.stringify(getConfig().models), 'enabled:', getConfig().enabled);
  try {
    const out = await translateBatch(['你好，世界', '这段代码如何部署到服务器'], 'en');
    console.log('TRANSLATED:', JSON.stringify(out));
  } catch (e) {
    console.log('translateBatch FAIL:', e.message);
    console.log('detail:', JSON.stringify(e.response ? e.response.data : e.config ? { url: e.config.url, baseURL: e.config.baseURL } : e.message).slice(0, 600));
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });