const express = require('express');
const {
  adminLogin,
  adminLogout,
  adminTwoFactorVerify,
  adminTwoFactorSetup,
  adminTwoFactorEnable,
  adminTwoFactorDisable,
  adminTwoFactorStatus,
  getAllUsers,
  getAllPosts,
  getAllComments,
  deletePost,
  deleteComment,
  updateUserStatus,
  deleteUser,
  getStats,
  getPendingComments,
  moderateCommentManual,
  retryModeration,
  getModerationQuota,
  runModerationTick
} = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { adminLoginLimiter, adminTwoFactorLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

router.post('/login', adminLoginLimiter, adminLogin);
router.post('/logout', adminLogout);
router.post('/2fa/verify', adminTwoFactorLimiter, adminTwoFactorVerify);

router.get('/2fa/status', protect, authorize('admin'), adminTwoFactorStatus);
router.post('/2fa/setup', protect, authorize('admin'), adminTwoFactorSetup);
router.post('/2fa/enable', protect, authorize('admin'), adminTwoFactorEnable);
router.post('/2fa/disable', protect, authorize('admin'), adminTwoFactorDisable);

router.get('/stats', protect, authorize('admin'), getStats);

router.get('/users', protect, authorize('admin'), getAllUsers);
router.put('/users/:id/status', protect, authorize('admin'), updateUserStatus);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

router.get('/posts', protect, authorize('admin'), getAllPosts);
router.delete('/posts/:id', protect, authorize('admin'), deletePost);

router.get('/comments', protect, authorize('admin'), getAllComments);
router.delete('/comments/:id', protect, authorize('admin'), deleteComment);

// 评论审核队列
router.get('/comments/queue', protect, authorize('admin'), getPendingComments);
router.put('/comments/:id/moderate', protect, authorize('admin'), moderateCommentManual);
router.post('/comments/:id/retry-moderation', protect, authorize('admin'), retryModeration);
router.get('/moderation/quota', protect, authorize('admin'), getModerationQuota);
router.post('/moderation/tick', protect, authorize('admin'), runModerationTick);

module.exports = router;
