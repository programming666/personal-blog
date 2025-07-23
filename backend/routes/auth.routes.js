const express = require('express');
const { 
  register, 
  login, 
  githubAuth, 
  githubAuthCallback, 
  getCurrentUser, 
  logout 
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// 公共路由
router.post('/register', register);
router.post('/login', login);
router.get('/github', githubAuth);
router.get('/github/callback', githubAuthCallback);
router.get('/logout', logout);

// 受保护路由
router.get('/me', protect, getCurrentUser);

module.exports = router;