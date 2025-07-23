const express = require('express');
const router = express.Router();
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  getUserPosts
} = require('../controllers/post.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload, processImage } = require('../middleware/upload.middleware');
const { optionalTurnstile } = require('../middleware/turnstile.middleware');

// 公开路由
router.get('/', getPosts);
router.get('/:id', getPost);
router.get('/user/me', protect, getUserPosts);

// 受保护的路由
router.post('/', protect, upload.single('thumbnail'), processImage, optionalTurnstile, createPost);
router.put('/:id', protect, upload.single('thumbnail'), processImage, updatePost);
router.delete('/:id', protect, deletePost);
router.post('/:id/like', protect, likePost);

module.exports = router;