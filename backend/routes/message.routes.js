const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getUserMessages,
  markAsRead,
  deleteMessage,
  getAllMessages,
  getUnreadCount
} = require('../controllers/message.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// 管理员路由
router.post('/', protect, authorize('admin'), sendMessage);
router.get('/all', protect, authorize('admin'), getAllMessages);

// 用户路由
router.get('/', protect, getUserMessages);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteMessage);
router.get('/unread-count', protect, getUnreadCount);

module.exports = router;