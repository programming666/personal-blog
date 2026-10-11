const Announcement = require('../models/Announcement');
const { invalidateSource, prewarmTranslations } = require('../services/aiTranslate');
const mongoose = require('mongoose');
const { parsePagination } = require('../utils/pagination');

exports.listAnnouncements = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });

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
    // 非法 ObjectId → 400(否则 CastError 被 catch 吞成 500,线上实测 /api/announcements/xyz)
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: '无效的公告 ID' });
    }
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
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });

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
    // 发布后异步预热译文
    prewarmTranslations({ sourceType: 'announcement', sourceId: announcement._id }, { title: announcement.title, body: announcement.content }).catch(() => {});
    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: '无效的公告 ID' });
    }
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

    // 内容已变更,失效旧译文缓存 + 异步预热新译文
    await invalidateSource('announcement', announcement._id);
    prewarmTranslations({ sourceType: 'announcement', sourceId: announcement._id }, { title: announcement.title, body: announcement.content || '' }).catch(() => {});
    res.status(200).json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: '无效的公告 ID' });
    }
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
