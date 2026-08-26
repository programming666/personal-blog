// 把已有 GitHub 用户的 name 字段改成 username(GitHub handle)
//
// 背景:
//   旧 passport.js 创建用户时用 profile.displayName(昵称)填 name 字段;
//   新代码改用 profile.username(handle)。本脚本把存量数据对齐到新口径。
//
// 范围:githubId 非空 且 role !== 'admin' 的用户(admin 名字由站长在管理面板自定义,不动)
//
// 用法:
//   cd backend && node scripts/normalize-github-user-names.js
//
// 安全:幂等。仅修改 name = username 当两者不一致时。

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('缺少 MONGODB_URI');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[normalize-github-user-names] connected to MongoDB');

  const candidates = await User.find({
    githubId: { $exists: true, $ne: null },
    role: { $ne: 'admin' }
  }).select('_id username name');

  console.log(`找到 ${candidates.length} 条 GitHub 用户`);

  let changed = 0;
  for (const u of candidates) {
    if (u.name !== u.username) {
      console.log(`  ${u.username}: name "${u.name}" → "${u.username}"`);
      u.name = u.username;
      await u.save();
      changed++;
    }
  }

  console.log(`\n✅ 已更新 ${changed} 条;其余 ${candidates.length - changed} 条 name 本来就 = username,跳过。`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error('失败:', err);
  process.exit(1);
});
