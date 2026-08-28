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
  // 兼容 single('thumbnail') 与 fields([{name:'thumbnail', maxCount:1},...]) 两种用法
  const file = req.file || (req.files && req.files.thumbnail && req.files.thumbnail[0]);
  if (!file) {
    return next();
  }
  try {
    const filename = `thumbnail-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
    const filepath = path.join(uploadDir, filename);
    await sharp(file.buffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(filepath);
    file.filename = filename;
    file.path = `uploads/${filename}`;
    next();
  } catch (error) {
    next(error);
  }
};

const processGalleryImages = async (req, res, next) => {
  const files = (req.files && req.files.images) || [];
  if (!files.length) return next();
  try {
    const out = [];
    for (const file of files) {
      const filename = `gallery-${Date.now()}-${Math.round(Math.random() * 1e9)}-${Math.round(Math.random() * 1e4)}.jpg`;
      const filepath = path.join(uploadDir, filename);
      await sharp(file.buffer)
        .resize(1600, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(filepath);
      out.push(`uploads/${filename}`);
    }
    req.galleryPaths = out;
    next();
  } catch (error) {
    next(error);
  }
};

const processGalleryImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  try {
    const filename = `gallery-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
    const filepath = path.join(uploadDir, filename);
    await sharp(req.file.buffer)
      .resize(1600, 1200, { fit: 'inside', withoutEnlargement: true })
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

const processAvatar = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  try {
    const filename = `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
    const filepath = path.join(uploadDir, filename);
    await sharp(req.file.buffer)
      .resize(256, 256, { fit: 'cover' }) // 头像强制正方形
      .png()
      .toFile(filepath);
    req.file.filename = filename;
    req.file.path = `uploads/${filename}`;
    next();
  } catch (error) {
    next(error);
  }
};


// favicon:站点标签页图标 — 生成 64x64 PNG(浏览器 <link rel="icon"> 兼容)
const processFavicon = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  try {
    const filename = `favicon-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
    const filepath = path.join(uploadDir, filename);
    await sharp(req.file.buffer)
      .resize(64, 64, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toFile(filepath);
    req.file.filename = filename;
    req.file.path = `uploads/${filename}`;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { upload, processImage, processGalleryImages, processGalleryImage, processLogo, processAvatar, processFavicon };
