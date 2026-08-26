const express = require('express');
const compression = require('compression');
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
// 文本响应 gzip 压缩(HTML/JS/CSS/JSON 大幅瘦身,对移动端 LCP 显著)
app.use(compression());
// 静态文件服务
// 上传文件(图片)文件名带时间戳、内容不可变 → 长缓存 1 年(满足 efficient cache lifetime)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '365d', immutable: true }));
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
app.use('/api/translate', require('./routes/translate.routes'));

// 仅在 SERVE_FRONTEND=true 时,把前端 dist/ 也由 Express 服务
if (process.env.SERVE_FRONTEND === 'true') {
  const fs = require('fs');
  const distPath = path.resolve(__dirname, '..', 'frontend', 'dist');
  // 哈希文件名(内容不变)长缓存 1 年 immutable;其余 7d
  app.use(express.static(distPath, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=604800');
      }
    }
  }));
  // SPA fallback — 仅对不存在对应静态文件的非 /api、非 /uploads 路径返回 index.html;
  // 缺失的哈希资源(asset 404)必须如实 404,否则会被缓存成 HTML 毒化 CDN/浏览器
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
    const candidate = path.join(distPath, req.path);
    if (req.path !== '/' && (path.extname(req.path) !== '' || fs.existsSync(candidate))) {
      return res.status(404).end();
    }
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