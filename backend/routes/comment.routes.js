const express = require('express');
const {
  createComment,
  getPostComments,
  updateComment,
  deleteComment,
  likeComment
} = require('../controllers/comment.controller');
const { protect } = require('../middleware/auth.middleware');
const { optionalTurnstile } = require('../middleware/turnstile.middleware');
const {
  commentIpLimiter,
  commentDailyIpLimiter,
  commentCreateLimiter,
  commentDailyUserLimiter,
  commentSlowDown,
  likeIpLimiter,
  likeLimiter,
  likeDailyUserLimiter
} = require('../middleware/rateLimit.middleware');
const {
  honeypotCheck,
  checkOrigin,
  requireAccountAge,
  validateCommentBody,
  detectDuplicateComment,
  limitLikeToggle,
  blockBotUserAgent
} = require('../middleware/antiAbuse.middleware');

const router = express.Router();

router.get('/post/:postId', getPostComments);

router.post(
  '/',
  blockBotUserAgent,
  checkOrigin,
  commentIpLimiter,
  commentDailyIpLimiter,
  commentSlowDown,
  protect,
  requireAccountAge(60),
  commentCreateLimiter,
  commentDailyUserLimiter,
  honeypotCheck,
  optionalTurnstile,
  validateCommentBody,
  detectDuplicateComment,
  createComment
);

router.put('/:id', protect, updateComment);
router.delete('/:id', protect, deleteComment);

router.post(
  '/:id/like',
  blockBotUserAgent,
  checkOrigin,
  likeIpLimiter,
  protect,
  requireAccountAge(10),
  likeLimiter,
  likeDailyUserLimiter,
  limitLikeToggle('comment'),
  likeComment
);

module.exports = router;
