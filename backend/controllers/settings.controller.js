const Setting = require('../models/Setting');
const path = require('path');
const fs = require('fs');

const LOGO_KEY = 'site.logo';
const FAVICON_KEY = 'site.favicon';

exports.getPublicSettings = async (req, res) => {
  try {
    const docs = await Setting.find({
      key: { $in: [LOGO_KEY, FAVICON_KEY, 'site.title'] }
    });
    const obj = {};
    docs.forEach(d => { obj[d.key] = d.value; });
    res.status(200).json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, message: '请上传图片' });
    }

    const existing = await Setting.findOne({ key: LOGO_KEY });
    if (existing?.value?.path) {
      const oldPath = path.join(__dirname, '..', existing.value.path);
      fs.promises.unlink(oldPath).catch(() => {});
    }

    const value = { path: req.file.path };
    const setting = await Setting.findOneAndUpdate(
      { key: LOGO_KEY },
      { key: LOGO_KEY, value },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, data: setting.value });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

exports.deleteLogo = async (req, res) => {
  try {
    const existing = await Setting.findOne({ key: LOGO_KEY });
    if (existing?.value?.path) {
      const oldPath = path.join(__dirname, '..', existing.value.path);
      fs.promises.unlink(oldPath).catch(() => {});
    }
    await Setting.deleteOne({ key: LOGO_KEY });
    res.status(200).json({ success: true, message: 'Logo 已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

exports.uploadFavicon = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, message: '请上传图片' });
    }

    const existing = await Setting.findOne({ key: FAVICON_KEY });
    if (existing?.value?.path) {
      const oldPath = path.join(__dirname, '..', existing.value.path);
      fs.promises.unlink(oldPath).catch(() => {});
    }

    const value = { path: req.file.path };
    const setting = await Setting.findOneAndUpdate(
      { key: FAVICON_KEY },
      { key: FAVICON_KEY, value },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, data: setting.value });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

exports.deleteFavicon = async (req, res) => {
  try {
    const existing = await Setting.findOne({ key: FAVICON_KEY });
    if (existing?.value?.path) {
      const oldPath = path.join(__dirname, '..', existing.value.path);
      fs.promises.unlink(oldPath).catch(() => {});
    }
    await Setting.deleteOne({ key: FAVICON_KEY });
    res.status(200).json({ success: true, message: 'Favicon 已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};
