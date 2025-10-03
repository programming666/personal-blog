const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 管理员登录
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证管理员用户名和密码（直接与环境变量比较）
    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // 创建临时管理员用户对象（不保存到数据库）
    const adminUser = {
      _id: 'admin',
      username: 'admin',
      name: '系统管理员',
      role: 'admin'
    };

    // 生成JWT token
    const token = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET, { 
      expiresIn: '1h' // 设置较短的过期时间
    });

    res.status(200).json({
      success: true,
      token,
      user: adminUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 获取所有用户
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 获取所有文章
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find({})
      .populate('author', 'username name avatar')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 获取所有评论
exports.getAllComments = async (req, res) => {
  try {
    const comments = await Comment.find({})
      .populate('author', 'username name avatar')
      .populate('post', 'title slug')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 删除文章
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    await Post.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 删除评论
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    await Comment.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 更新用户状态
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      canComment = true, 
      canPost = true, 
      canLogin = true 
    } = req.body;

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 更新用户状态字段
    user.canComment = canComment;
    user.canPost = canPost;
    user.canLogin = canLogin;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 删除用户及其所有文章
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 删除用户的所有文章
    await Post.deleteMany({ author: id });
    
    // 删除用户的所有评论
    await Comment.deleteMany({ author: id });
    
    // 删除用户
    await User.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'User and all associated content deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 获取统计信息
exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalComments = await Comment.countDocuments();
    const recentPosts = await Post.find({})
      .populate('author', 'username name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalPosts,
        totalComments,
        recentPosts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};