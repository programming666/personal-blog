const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  createBroadcast,
  getBroadcasts,
  getBroadcastDetails,
  retryBroadcast,
  getBroadcastStats
} = require('../controllers/broadcast.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// 获取所有用户列表（用于广播选择）
router.get('/users', protect, authorize('admin'), getAllUsers);

// 创建广播消息
router.post('/', protect, authorize('admin'), createBroadcast);

// 获取广播消息列表
router.get('/', protect, authorize('admin'), getBroadcasts);

// 获取广播详情
router.get('/:id', protect, authorize('admin'), getBroadcastDetails);

// 重试失败的广播
router.post('/:id/retry', protect, authorize('admin'), retryBroadcast);

// 获取广播统计信息
router.get('/stats/summary', protect, authorize('admin'), getBroadcastStats);

module.exports = router;