const express = require('express');
const router = express.Router();
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost
} = require('../controllers/post.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { upload, processImage } = require('../middleware/upload.middleware');
const { optionalTurnstile } = require('../middleware/turnstile.middleware');
const {
  postWriteLimiter,
  likeIpLimiter,
  likeLimiter,
  likeDailyUserLimiter
} = require('../middleware/rateLimit.middleware');
const {
  checkOrigin,
  requireAccountAge,
  limitLikeToggle,
  blockBotUserAgent
} = require('../middleware/antiAbuse.middleware');

router.get('/', getPosts);
router.get('/:id', getPost);

router.post(
  '/',
  protect,
  authorize('admin'),
  postWriteLimiter,
  upload.single('thumbnail'),
  processImage,
  optionalTurnstile,
  createPost
);
router.put(
  '/:id',
  protect,
  authorize('admin'),
  postWriteLimiter,
  upload.single('thumbnail'),
  processImage,
  updatePost
);
router.delete('/:id', protect, authorize('admin'), deletePost);

router.post(
  '/:id/like',
  blockBotUserAgent,
  checkOrigin,
  likeIpLimiter,
  protect,
  requireAccountAge(10),
  likeLimiter,
  likeDailyUserLimiter,
  limitLikeToggle('post'),
  likePost
);

module.exports = router;
