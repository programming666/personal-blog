const express = require('express');
const { protect, authorize } = require('../middleware/auth.middleware');
const { getPresentationConfig, updatePresentationConfig } = require('../controllers/presentation.controller');

const router = express.Router();

router.get('/', protect, authorize('admin'), getPresentationConfig);
router.put('/', protect, authorize('admin'), updatePresentationConfig);

module.exports = router;
