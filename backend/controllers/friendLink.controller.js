const FriendLink = require('../models/FriendLink');

// 公开:只返回启用的友链,按 sortOrder 升序
exports.listFriendLinks = async (req, res) => {
  try {
    const items = await FriendLink.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取友链失败' });
  }
};

// admin:全部友链(含未启用)
exports.listAllFriendLinks = async (req, res) => {
  try {
    const items = await FriendLink.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取友链失败' });
  }
};

exports.createFriendLink = async (req, res) => {
  try {
    const { name, url, description, avatar, sortOrder, isActive, reciprocal } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: '站点名称不能为空' });
    if (!url || !url.trim()) return res.status(400).json({ success: false, message: '链接地址不能为空' });
    const link = await FriendLink.create({
      name: name.trim(),
      url: url.trim(),
      description: (description || '').trim(),
      avatar: (avatar || '').trim(),
      sortOrder: Number(sortOrder) || 0,
      isActive: isActive !== false,
      reciprocal: !!reciprocal
    });
    res.status(201).json({ success: true, data: link });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建友链失败' });
  }
};

exports.updateFriendLink = async (req, res) => {
  try {
    const link = await FriendLink.findById(req.params.id);
    if (!link) return res.status(404).json({ success: false, message: '友链不存在' });
    const { name, url, description, avatar, sortOrder, isActive, reciprocal } = req.body;
    if (name !== undefined) link.name = String(name).trim();
    if (url !== undefined) link.url = String(url).trim();
    if (description !== undefined) link.description = String(description).trim();
    if (avatar !== undefined) link.avatar = String(avatar).trim();
    if (sortOrder !== undefined) link.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) link.isActive = !!isActive;
    if (reciprocal !== undefined) link.reciprocal = !!reciprocal;
    await link.save();
    res.json({ success: true, data: link });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新友链失败' });
  }
};

exports.deleteFriendLink = async (req, res) => {
  try {
    const link = await FriendLink.findByIdAndDelete(req.params.id);
    if (!link) return res.status(404).json({ success: false, message: '友链不存在' });
    res.json({ success: true, message: '已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除友链失败' });
  }
};
