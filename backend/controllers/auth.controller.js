const User = require('../models/User');
const Message = require('../models/Message');
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

    // 发送欢迎站内信
    try {
      await Message.create({
        title: '欢迎',
        content: '欢迎使用',
        sender: '系统',
        recipient: user._id.toString(),
        recipientType: 'user_id'
      });
    } catch (messageError) {
      console.error('发送欢迎消息失败:', messageError);
      // 不中断注册流程，继续返回注册成功
    }

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
      
      // 如果是新注册的GitHub用户，发送欢迎消息
      if (req.user._isNew) {
        try {
          await Message.create({
            title: '欢迎',
            content: '欢迎使用',
            sender: '系统',
            recipient: user._id.toString(),
            recipientType: 'user_id'
          });
        } catch (messageError) {
          console.error('发送欢迎消息失败:', messageError);
          // 不中断流程，继续重定向
        }
      }
      
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
    // 如果是虚拟管理员用户，直接返回
    if (req.user._id === 'admin') {
      return res.status(200).json({
        success: true,
        data: req.user
      });
    }
    
    // 普通用户从数据库获取
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
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
