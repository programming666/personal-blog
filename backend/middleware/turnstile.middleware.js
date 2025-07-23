const axios = require('axios');

/**
 * Cloudflare Turnstile 人机验证中间件
 * 用于验证前端提交的Turnstile token
 */
const validateTurnstile = async (req, res, next) => {
  try {
    const { 'cf-turnstile-response': token } = req.body;
    
    // 检查token是否存在
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Turnstile token is required'
      });
    }

    // 验证token长度
    if (token.length > 2048) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Turnstile token'
      });
    }

    // 准备验证数据
    const formData = new URLSearchParams();
    formData.append('secret', process.env.TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    
    // 添加用户IP地址（如果可用）
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (clientIP && clientIP !== 'unknown') {
      formData.append('remoteip', clientIP);
    }

    // 调用Cloudflare Turnstile验证API
    const response = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000 // 30秒超时
      }
    );

    const result = response.data;

    // 检查验证结果
    if (!result.success) {
      console.warn('Turnstile validation failed:', result['error-codes']);
      return res.status(400).json({
        success: false,
        message: 'Human verification failed',
        errors: result['error-codes']
      });
    }

    // 检查token年龄（超过4分钟发出警告）
    if (result.challenge_ts) {
      const challengeTime = new Date(result.challenge_ts);
      const now = new Date();
      const ageMinutes = (now - challengeTime) / (1000 * 60);
      
      if (ageMinutes > 4) {
        console.warn(`Turnstile token is ${ageMinutes.toFixed(1)} minutes old`);
      }
    }

    // 验证通过，继续处理请求
    next();
  } catch (error) {
    console.error('Turnstile validation error:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(503).json({
        success: false,
        message: 'Turnstile service timeout'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Turnstile validation service error'
    });
  }
};

/**
 * 可选的Turnstile验证中间件
 * 仅在环境变量要求验证时启用
 */
const optionalTurnstile = (req, res, next) => {
  // 如果未配置Turnstile密钥，则跳过验证
  if (!process.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY === 'your_turnstile_secret_key_here') {
    return next();
  }
  
  return validateTurnstile(req, res, next);
};

/**
 * 严格的Turnstile验证中间件
 * 强制要求验证，即使未配置密钥也会返回错误
 */
const strictTurnstile = (req, res, next) => {
  // 检查是否配置了Turnstile密钥
  if (!process.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY === '0x4AAAAAABs7bLJmbkCbrZqtCwhdTpcvlkA') {
    return res.status(500).json({
      success: false,
      message: 'Turnstile configuration is required'
    });
  }
  
  return validateTurnstile(req, res, next);
};

module.exports = {
  validateTurnstile,
  optionalTurnstile,
  strictTurnstile
};