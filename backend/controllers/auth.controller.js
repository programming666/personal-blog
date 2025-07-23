const User = require('../models/User');
const passport = require('passport');
const { optionalTurnstile } = require('../middleware/turnstile.middleware');

// 用户注册
 exports.register = async (req, res) => {
  try {
    const { username, email, password, passwordConfirm } = req.body;

    // 验证密码是否一致
    if (password !== passwordConfirm) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // 检查用户是否已存在
    let user = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // 创建新用户
    user = await User.create({
      username,
      email,
      password
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 用户登录
 exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 验证邮箱和密码是否提供
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // 检查用户
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 检查密码是否匹配
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GitHub OAuth认证
 exports.githubAuth = passport.authenticate('github', { scope: ['user:email'] });

// GitHub OAuth回调
 exports.githubAuthCallback = (req, res, next) => {
  passport.authenticate('github', 
    { failureRedirect: '/login', session: false }, 
    async (err, user) => {
      if (err) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=github_auth_failed`);
      }
      
      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=user_not_found`);
      }
      
      // 创建token
      const token = user.getSignedJwtToken();
      
      // 重定向到前端回调页面，附带token和用户信息
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/github-callback?` +
        `token=${token}&` +
        `userId=${user._id}&` +
        `username=${encodeURIComponent(user.username)}&` +
        `email=${encodeURIComponent(user.email)}&` +
        `name=${encodeURIComponent(user.name || user.username)}&` +
        `avatar=${encodeURIComponent(user.avatar || '')}`;
      
      res.redirect(redirectUrl);
    }
  )(req, res, next);
};

// 获取当前登录用户
 exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 用户登出
 exports.logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// 发送Token响应
const sendTokenResponse = (user, statusCode, res) => {
  // 创建token
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatar: user.avatar
    }
  });
};
