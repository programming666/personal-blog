const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 保护路由中间件
exports.protect = async (req, res, next) => {
  let token;

  // 从请求头获取token
  if (
    req.headers.authorization && 
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 确保token存在
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log('Token decoded:', decoded);
    console.log('Authorization header:', req.headers.authorization);

    // 检查是否为管理员用户
    if (decoded.id === 'admin' && decoded.role === 'admin') {
      // 创建虚拟管理员用户对象
      req.user = {
        _id: 'admin',
        username: 'admin',
        name: '系统管理员',
        role: 'admin',
        canLogin: true,
        canComment: true,
        canPost: true
      };
      console.log('Admin user created:', req.user);
    } else {
      // 普通用户，从数据库查找
      req.user = await User.findById(decoded.id);
      
      // 检查用户是否被禁止登录
      if (req.user && req.user.canLogin === false) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended'
        });
      }
      console.log('Regular user found:', req.user);
    }
    
    // 确保用户存在
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};
// 角色授权中间件
exports.authorize = (...roles) => {
  return (req, res, next) => {
    console.log('Authorize middleware - req.user:', req.user);
    console.log('Required roles:', roles);
    
    if (!roles.includes(req.user.role)) {
      console.log('Access denied - user role:', req.user.role, 'required roles:', roles);
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    console.log('Access granted - user role:', req.user.role);
    next();
  };
};
