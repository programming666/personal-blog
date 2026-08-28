const express = require('express');
const router = express.Router();
const { getPublicSettings, uploadLogo, deleteLogo, uploadFavicon, deleteFavicon } = require('../controllers/settings.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { upload, processLogo, processFavicon } = require('../middleware/upload.middleware');

router.get('/', getPublicSettings);
router.post('/logo', protect, authorize('admin'), upload.single('logo'), processLogo, uploadLogo);
router.delete('/logo', protect, authorize('admin'), deleteLogo);
router.post('/favicon', protect, authorize('admin'), upload.single('favicon'), processFavicon, uploadFavicon);
router.delete('/favicon', protect, authorize('admin'), deleteFavicon);

module.exports = router;
