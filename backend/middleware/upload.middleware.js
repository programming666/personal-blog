const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在（兼容Linux和Windows）
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.memoryStorage();

// 文件过滤器
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件！'), false);
  }
};

// 创建multer实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
  }
});

// 图片压缩处理中间件
const processImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const filename = `thumbnail-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
    const filepath = path.join(uploadDir, filename);

    // 使用sharp压缩图片
    await sharp(req.file.buffer)
      .resize(800, 600, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toFile(filepath);

    // 设置文件路径（使用正斜杠，兼容Linux）
    req.file.filename = filename;
    req.file.path = `uploads/${filename}`;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upload,
  processImage
};