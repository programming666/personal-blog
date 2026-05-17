// 一次性修复 — 断开 admin 账号上残留的 githubId 绑定
//
// 背景:
//   旧版 passport.js 在 GitHub 登录时,若 GitHub 用户名或邮箱与已有用户冲突,
//   会自动把 GitHub 身份合并进那个已有用户,并用 GitHub 头像覆盖原 avatar。
//   当 ADMIN_USERNAME 与 GitHub 用户名/邮箱碰巧匹配时,所有后续 OAuth 登录
//   都会解析到 admin,GitHub 用户实际是在以 admin 身份评论。
//
//   修过 passport.js 后,新登录不会再合并。但 admin 记录上残留的 githubId
//   仍会让"上次合并的 GitHub 账号"继续被识别为 admin。本脚本去掉这条残留,
//   并报告有多少历史评论是 admin 在用 — 这部分需要你自己决定是否清理。
//
// 用法:
//   cd backend && node scripts/unlink-admin-github.js
//
// 安全:幂等,无 githubId 时无副作用。不删除/迁移任何评论。

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Post = require('../models/Post');

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('缺少 MONGODB_URI');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[unlink-admin-github] connected to MongoDB');

  const admins = await User.find({ role: 'admin' }).select('+twoFactorSecret');
  if (admins.length === 0) {
    console.log('数据库里没有 admin 用户 — 无事可做');
    await mongoose.disconnect();
    return;
  }

  for (const admin of admins) {
    console.log(`\nadmin 用户: username=${admin.username}, _id=${admin._id}`);
    console.log(`  githubId  : ${admin.githubId || '(无)'}`);
    console.log(`  avatar    : ${admin.avatar || '(无)'}`);
    console.log(`  name      : ${admin.name || '(无)'}`);

    const commentCount = await Comment.countDocuments({ author: admin._id });
    const postCount = await Post.countDocuments({ author: admin._id });
    console.log(`  关联评论数: ${commentCount}`);
    console.log(`  关联文章数: ${postCount}`);

    if (admin.githubId) {
      admin.githubId = undefined;
      await admin.save();
      console.log('  ✅ 已清除 admin.githubId');
    } else {
      console.log('  — admin.githubId 本来就为空,跳过');
    }
  }

  console.log('\n完成。下一次走 /api/auth/github 登录会创建一条全新的 User 记录(不再被识别为 admin)。');
  console.log('注:历史评论 / 文章作者仍指向 admin,如需迁移到新创建的 GitHub 用户,请手动 mongosh:');
  console.log('  db.comments.updateMany({author: ObjectId("<admin _id>")}, {$set: {author: ObjectId("<new gh user _id>")}})');
  console.log('  db.posts.updateMany({author: ObjectId("<admin _id>")}, {$set: {author: ObjectId("<new gh user _id>")}})');
  console.log('(仅在你确认这些内容本该属于 GitHub 用户、而不是 admin 时执行)');

  await mongoose.disconnect();
})().catch((err) => {
  console.error('失败:', err);
  process.exit(1);
});
