const { getPresentation, savePresentation } = require('../services/presentation');

const requireAdmin = (req, res) => {
  if (req.user?.role === 'admin') return true;
  res.status(req.user ? 403 : 401).json({ success: false, message: '需要管理员权限' });
  return false;
};

exports.getPresentationConfig = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const data = await getPresentation();
    res.status(200).json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, message: '读取外观设置失败，请稍后重试' });
  }
};

exports.updatePresentationConfig = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const data = await savePresentation(req.body);
    res.status(200).json({ success: true, data });
  } catch (error) {
    if (error.statusCode === 400 && error.errors) {
      return res.status(400).json({ success: false, message: error.message, errors: error.errors });
    }
    res.status(500).json({ success: false, message: '保存外观设置失败，请稍后重试' });
  }
};
