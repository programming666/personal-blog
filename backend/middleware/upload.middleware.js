const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const uploadDir = path.join(__dirname, '..', 'uploads'); // 确保上传目录存在
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.memoryStorage(); // 配置multer存储
const fileFilter = (req, file, cb) => { // 文件过滤器
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件！'), false);
  }
};
const upload = multer({ // 创建multer实例
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 
  }
});
const processImage = async (req, res, next) => { // 图片压缩
  if (!req.file) {
    return next();
  }
  try {
    const filename = `thumbnail-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
    const filepath = path.join(uploadDir, filename);
    await sharp(req.file.buffer)     // 使用sharp压缩图片
      .resize(800, 600, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toFile(filepath);
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