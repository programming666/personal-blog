const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();
// 初始化 Express 应用
const app = express();
app.set('trust proxy', 1);
// 中间件配置
// CORS 白名单 — 严格允许 FRONTEND_URL + 可选 ALLOWED_ORIGINS,杜绝 origin: true 的反射:
// 旧逻辑会把任意 Origin 反射回 ACAO,配合 credentials: true 让任何站点的脚本
// 在管理员登录期间跨域读取 /api/admin/* 响应。
const corsAllowlist = [
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
]
  .filter(Boolean)
  .map((o) => o.replace(/\/$/, ''));

app.use(cors({
  origin: (origin, cb) => {
    // 同源 / 无浏览器 (curl, 服务端到服务端) — Origin 缺失,直接放行
    if (!origin) return cb(null, true);
    const normalized = origin.replace(/\/$/, '');
    if (corsAllowlist.includes(normalized)) return cb(null, true);
    // 不在白名单 — 返回 false 让 cors 中间件不写 ACAO 头,浏览器会自然拒绝
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// 数据库连接
require('./config/db')();
// 初始化 Passport
require('./config/passport')(passport);
app.use(passport.initialize());
// 启动评论审核队列消费者
require('./services/moderationQueueWorker').start();
// 路由配置
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/posts', require('./routes/post.routes'));
app.use('/api/comments', require('./routes/comment.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/announcements', require('./routes/announcement.routes'));
app.use('/api/settings', require('./routes/settings.routes'));

// 仅在 SERVE_FRONTEND=true 时,把前端 dist/ 也由 Express 服务
if (process.env.SERVE_FRONTEND === 'true') {
  const path = require('path');
  const distPath = path.resolve(__dirname, '..', 'frontend', 'dist');
  // 静态资源 — 加 7d 缓存
  app.use(express.static(distPath, { maxAge: '7d', index: false }));
  // SPA fallback — 所有非 /api、非 /uploads 的请求都返回 index.html
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}
// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Personal Blog API running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});
// 启动服务器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
module.exports = app;