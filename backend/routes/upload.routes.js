const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { upload, processGalleryImage } = require('../middleware/upload.middleware');
const { postWriteLimiter } = require('../middleware/rateLimit.middleware');

// 独立图片上传端点(供文章编辑器边写边插图使用)
// admin only,最多 5MB,image/* only
router.post(
  '/image',
  protect,
  authorize('admin'),
  postWriteLimiter,
  upload.single('image'),
  processGalleryImage,
  (req, res) => {
    if (!req.file || !req.file.filename) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片文件'
      });
    }
    const origin = `${req.protocol}://${req.get('host')}`;
    res.json({
      success: true,
      url: `/uploads/${req.file.filename}`,
      fullUrl: `${origin}/uploads/${req.file.filename}`,
      filename: req.file.filename
    });
  }
);

module.exports = router;