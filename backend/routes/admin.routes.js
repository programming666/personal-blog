const express = require('express');
const {
  adminLogin,
  getAllUsers,
  getAllPosts,
  getAllComments,
  deletePost,
  deleteComment,
  updateUserStatus,
  deleteUser,
  getStats
} = require('../controllers/admin.controller');
const {
  sendMessage,
  getAllMessages
} = require('../controllers/message.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// 管理员登录
router.post('/login', adminLogin);

// 获取统计信息
router.get('/stats', protect, authorize('admin'), getStats);

// 用户管理
router.get('/users', protect, authorize('admin'), getAllUsers);
router.put('/users/:id/status', protect, authorize('admin'), updateUserStatus);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

// 文章管理
router.get('/posts', protect, authorize('admin'), getAllPosts);
router.delete('/posts/:id', protect, authorize('admin'), deletePost);

// 评论管理
router.get('/comments', protect, authorize('admin'), getAllComments);
router.delete('/comments/:id', protect, authorize('admin'), deleteComment);

// 消息管理
router.get('/messages', protect, authorize('admin'), getAllMessages);
router.post('/messages', protect, authorize('admin'), sendMessage);

module.exports = router;