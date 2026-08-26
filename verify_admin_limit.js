// 验证:管理员豁免 100 字上限的后端逻辑
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const LONG = '这是一条超过一百个字符的管理员长评论测试。'.repeat(8); // ~200 字

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blog');
  const Comment = require('./models/Comment');

  // 1. 普通 save → 应被 schema maxlength 拦截
  try {
    const c1 = new Comment({ content: LONG, post: '6a098ccad09531e7b2c6499b', author: '6a098c40020b1f70f4e455e7' });
    await c1.save();
    console.log('普通 save: 竟然成功(不应!)');
    await Comment.deleteOne({ _id: c1._id });
  } catch (e) {
    console.log('普通 save 被拦截 ✓:', e.errors?.content?.message || e.message);
  }

  // 2. validateBeforeSave:false(admin 分支)→ 应成功
  const c2 = new Comment({ content: LONG, post: '6a098ccad09531e7b2c6499b', author: '6a098c40020b1f70f4e455e7', moderationStatus: 'approved' });
  await c2.save({ validateBeforeSave: false });
  console.log('admin 式 save 成功 ✓, 长度 =', c2.content.length);
  await Comment.deleteOne({ _id: c2._id });

  await mongoose.disconnect();
  console.log('DONE');
})().catch((e) => { console.error(e); process.exit(1); });