const express = require('express');
const {
  githubAuth,
  githubAuthCallback,
  getCurrentUser,
  logout
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/github', githubAuth);
router.get('/github/callback', githubAuthCallback);
router.get('/logout', logout);

router.get('/me', protect, getCurrentUser);

module.exports = router;
