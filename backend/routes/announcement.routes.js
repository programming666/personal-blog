const express = require('express');
const router = express.Router();
const {
  listAnnouncements,
  getAnnouncement,
  listAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcement.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/admin/all', protect, authorize('admin'), listAllAnnouncements);
router.post('/', protect, authorize('admin'), createAnnouncement);
router.put('/:id', protect, authorize('admin'), updateAnnouncement);
router.delete('/:id', protect, authorize('admin'), deleteAnnouncement);

router.get('/', listAnnouncements);
router.get('/:id', getAnnouncement);

module.exports = router;
