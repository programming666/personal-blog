/**
 * 一次性迁移：把旧的 BroadcastMessage 转成 Announcement，丢弃 messages 集合，
 * 清理 User 文档上残留的 password / canPost 字段。
 *
 * 用法：
 *   cd backend && node scripts/migrate-to-announcements.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI 未设置');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const names = new Set(collections.map(c => c.name));

  if (names.has('broadcastmessages')) {
    const broadcasts = await db.collection('broadcastmessages').find({}).toArray();
    if (broadcasts.length > 0) {
      const docs = broadcasts.map(b => ({
        title: b.title,
        content: b.content,
        isPublished: true,
        pinned: false,
        createdAt: b.createdAt || new Date(),
        updatedAt: b.updatedAt || new Date()
      }));
      await Announcement.insertMany(docs);
      console.log(`已迁移 ${docs.length} 条 BroadcastMessage 到 Announcement`);
    }
    await db.collection('broadcastmessages').drop();
    console.log('已删除 broadcastmessages 集合');
  }

  if (names.has('messages')) {
    await db.collection('messages').drop();
    console.log('已删除 messages 集合');
  }

  if (names.has('users')) {
    const result = await db.collection('users').updateMany(
      { $or: [{ password: { $exists: true } }, { canPost: { $exists: true } }] },
      { $unset: { password: '', canPost: '' } }
    );
    console.log(`清理 users 文档：matched=${result.matchedCount} modified=${result.modifiedCount}`);
  }

  await mongoose.disconnect();
  console.log('迁移完成');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
