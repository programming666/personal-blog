const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const path = require('path');
require('dotenv').config();
// 初始化 Express 应用
const app = express();
// 中间件配置
app.use(cors({
  origin: true, // 允许所有来源
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// 数据库连接
require('./config/db')();
// 初始化 Passport
require('./config/passport')(passport);
app.use(passport.initialize());
// 路由配置
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/posts', require('./routes/post.routes'));
app.use('/api/comments', require('./routes/comment.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
// 根路由测试
app.get('/', (req, res) => {
  res.json({ message: 'Personal Blog API running' });
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