const express = require('express');
const router = express.Router();
const { getPublicSettings, uploadLogo, deleteLogo } = require('../controllers/settings.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { upload, processLogo } = require('../middleware/upload.middleware');

router.get('/', getPublicSettings);
router.post('/logo', protect, authorize('admin'), upload.single('logo'), processLogo, uploadLogo);
router.delete('/logo', protect, authorize('admin'), deleteLogo);

module.exports = router;
