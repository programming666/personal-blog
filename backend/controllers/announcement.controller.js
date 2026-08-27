const Announcement = require('../models/Announcement');
const { invalidateSource } = require('../services/aiTranslate');

exports.listAnnouncements = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = { isPublished: true };
    const [items, total] = await Promise.all([
      Announcement.find(query)
        .sort({ pinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Announcement.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: items.length,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
      data: items
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

exports.getAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement || (!announcement.isPublished && !isAdmin(req))) {
      return res.status(404).json({ success: false, message: '公告不存在' });
    }
    res.status(200).json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

exports.listAllAnnouncements = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Announcement.find()
        .sort({ pinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Announcement.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      count: items.length,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
      data: items
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, isPublished, pinned } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: '请提供标题和内容' });
    }
    const announcement = await Announcement.create({
      title,
      content,
      isPublished: isPublished !== false,
      pinned: !!pinned
    });
    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const updates = {};
    ['title', 'content', 'isPublished', 'pinned'].forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!announcement) {
      return res.status(404).json({ success: false, message: '公告不存在' });

    }

    // 内容已变更,失效旧译文缓存,下次访问按需重译
    await invalidateSource('announcement', announcement._id);
    res.status(200).json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: '公告不存在' });
    }
    res.status(200).json({ success: true, message: '公告已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}
