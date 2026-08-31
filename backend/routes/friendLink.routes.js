const express = require('express');
const router = express.Router();
const {
  listFriendLinks,
  listAllFriendLinks,
  createFriendLink,
  updateFriendLink,
  deleteFriendLink
} = require('../controllers/friendLink.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// 公开:启用的友链
router.get('/', listFriendLinks);

// admin
router.get('/admin/all', protect, authorize('admin'), listAllFriendLinks);
router.post('/', protect, authorize('admin'), createFriendLink);
router.put('/:id', protect, authorize('admin'), updateFriendLink);
router.delete('/:id', protect, authorize('admin'), deleteFriendLink);

module.exports = router;
