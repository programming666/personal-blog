const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件！'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const processImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  try {
    const filename = `thumbnail-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
    const filepath = path.join(uploadDir, filename);
    await sharp(req.file.buffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(filepath);
    req.file.filename = filename;
    req.file.path = `uploads/${filename}`;
    next();
  } catch (error) {
    next(error);
  }
};

const processLogo = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  try {
    const filename = `logo-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
    const filepath = path.join(uploadDir, filename);
    await sharp(req.file.buffer)
      .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toFile(filepath);
    req.file.filename = filename;
    req.file.path = `uploads/${filename}`;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { upload, processImage, processLogo };
