const express = require('express');
const { 
  createComment, 
  getPostComments, 
  updateComment, 
  deleteComment, 
  likeComment 
} = require('../controllers/comment.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// 公共路由
router.get('/post/:postId', getPostComments);

// 受保护路由
router.post('/', protect, createComment);
router.put('/:id', protect, updateComment);
router.delete('/:id', protect, deleteComment);
router.post('/:id/like', protect, likeComment);

module.exports = router;