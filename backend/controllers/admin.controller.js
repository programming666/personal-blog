const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { getQuotaSnapshot, moderateComment } = require('../services/aiModeration');
const { tickNow } = require('../services/moderationQueueWorker');

const EMAIL_RE = /^[\w.+-]+@([\w-]+\.)+[\w-]{2,}$/;

const ADMIN_TOKEN_COOKIE = 'admin_token';
const ADMIN_TOKEN_MAX_AGE = 60 * 60 * 1000; // 1h,与 JWT 一致

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_TOKEN_MAX_AGE,
    path: '/'
  };
}

function setAdminCookie(res, token) {
  res.cookie(ADMIN_TOKEN_COOKIE, token, cookieOptions());
}

function clearAdminCookie(res) {
  res.clearCookie(ADMIN_TOKEN_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
}

function signAdminToken(adminUser) {
  return jwt.sign(
    { id: adminUser._id, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function signTwoFactorTicket(adminUser) {
  return jwt.sign(
    { id: adminUser._id, twoFactorPending: true },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
}

async function getOrCreateAdminUser() {
  const username = process.env.ADMIN_USERNAME;
  const email = EMAIL_RE.test(username) ? username : `${username}@local.admin`;
  return User.findOneAndUpdate(
    { username },
    {
      $setOnInsert: {
        username,
        email,
        name: '系统管理员'
      },
      $set: { role: 'admin', canLogin: true, canComment: true }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).select('+twoFactorSecret');
}

exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    const adminUser = await getOrCreateAdminUser();

    if (adminUser.twoFactorEnabled && adminUser.twoFactorSecret) {
      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        ticket: signTwoFactorTicket(adminUser)
      });
    }

    const token = signAdminToken(adminUser);
    setAdminCookie(res, token);
    res.status(200).json({
      success: true,
      token,
      user: {
        id: adminUser._id,
        username: adminUser.username,
        name: adminUser.name,
        role: 'admin',
        twoFactorEnabled: adminUser.twoFactorEnabled
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adminTwoFactorVerify = async (req, res) => {
  try {
    const { ticket, code } = req.body;
    if (!ticket || !code) {
      return res.status(400).json({ success: false, message: '缺少 ticket 或 验证码' });
    }

    let decoded;
    try {
      decoded = jwt.verify(ticket, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: '验证票据已过期，请重新登录' });
    }

    if (!decoded.twoFactorPending) {
      return res.status(400).json({ success: false, message: '无效的 2FA ticket' });
    }

    const adminUser = await User.findById(decoded.id).select('+twoFactorSecret');
    if (!adminUser || adminUser.role !== 'admin' || !adminUser.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '该账号未启用 2FA' });
    }

    const ok = speakeasy.totp.verify({
      secret: adminUser.twoFactorSecret,
      encoding: 'base32',
      token: String(code).replace(/\s+/g, ''),
      window: 1
    });

    if (!ok) {
      return res.status(401).json({ success: false, message: '验证码不正确' });
    }

    const token = signAdminToken(adminUser);
    setAdminCookie(res, token);
    res.status(200).json({
      success: true,
      token,
      user: {
        id: adminUser._id,
        username: adminUser.username,
        name: adminUser.name,
        role: 'admin',
        twoFactorEnabled: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adminLogout = (req, res) => {
  clearAdminCookie(res);
  res.status(200).json({ success: true, message: 'Logged out' });
};

exports.adminTwoFactorSetup = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '仅管理员可设置 2FA' });
    }

    const secret = speakeasy.generateSecret({
      length: 20,
      name: `Personal Blog (${user.username})`,
      issuer: 'Personal Blog'
    });

    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = false;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adminTwoFactorEnable = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: '请输入验证码' });
    }

    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!user || user.role !== 'admin' || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: '请先调用 setup 生成密钥' });
    }

    const ok = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: String(code).replace(/\s+/g, ''),
      window: 1
    });

    if (!ok) {
      return res.status(401).json({ success: false, message: '验证码不正确' });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.status(200).json({ success: true, message: '2FA 已启用' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adminTwoFactorDisable = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '仅管理员可操作' });
    }

    if (user.twoFactorEnabled) {
      const ok = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: String(code || '').replace(/\s+/g, ''),
        window: 1
      });
      if (!ok) {
        return res.status(401).json({ success: false, message: '验证码不正确' });
      }
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.status(200).json({ success: true, message: '2FA 已关闭' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adminTwoFactorStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      data: { enabled: !!user?.twoFactorEnabled }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find({})
      .populate('author', 'username name avatar')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: posts.length, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllComments = async (req, res) => {
  try {
    const comments = await Comment.find({})
      .populate('author', 'username name avatar')
      .populate('post', 'title slug')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: comments.length, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    await Post.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ post: req.params.id });
    res.status(200).json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    await Comment.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const updates = {};
    ['canComment', 'canLogin'].forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, message: 'User status updated', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot delete admin user' });
    }
    await Post.deleteMany({ author: id });
    await Comment.deleteMany({ author: id });
    await User.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'User and all associated content deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [totalUsers, totalPosts, totalComments, pendingComments, rejectedComments, recentPosts] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Comment.countDocuments(),
      Comment.countDocuments({ moderationStatus: 'pending' }),
      Comment.countDocuments({ moderationStatus: 'rejected' }),
      Post.find({}).populate('author', 'username name').sort({ createdAt: -1 }).limit(5)
    ]);
    res.status(200).json({
      success: true,
      data: { totalUsers, totalPosts, totalComments, pendingComments, rejectedComments, recentPosts }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- 评论审核队列 ----------

exports.getPendingComments = async (req, res) => {
  try {
    const status = ['pending', 'rejected', 'approved'].includes(req.query.status)
      ? req.query.status
      : 'pending';
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
    const comments = await Comment.find({ moderationStatus: status })
      .populate('post', 'title slug')
      .sort({ createdAt: -1 })
      .limit(limit);
    res.status(200).json({ success: true, count: comments.length, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// admin 手动覆盖审核结果: { status: 'approved'|'rejected', reason?: string }
exports.moderateCommentManual = async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status 必须是 approved 或 rejected' });
    }
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    comment.moderationStatus = status;
    comment.moderationReason = (reason || '管理员手动审核').slice(0, 200);
    comment.moderationModel = 'manual';
    await comment.save();
    res.status(200).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// admin 强制对某条 pending 评论立即重新调用 AI
exports.retryModeration = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    const verdict = await moderateComment(comment.content);
    comment.moderationStatus = verdict.status;
    comment.moderationReason = verdict.reason || '';
    comment.moderationModel = verdict.model || '';
    await comment.save();
    res.status(200).json({ success: true, data: comment, verdict });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// admin 查看 AI 审核配额快照 + 手动触发一次 queue tick
exports.getModerationQuota = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: getQuotaSnapshot() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.runModerationTick = async (req, res) => {
  try {
    tickNow();
    res.status(202).json({ success: true, message: 'queue tick scheduled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
