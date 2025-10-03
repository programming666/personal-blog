const Comment = require('../models/Comment');
const Post = require('../models/Post');

// 创建评论
exports.createComment = async (req, res) => {
  try {
    // 检查用户是否被禁止评论
    if (req.user.canComment === false) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to comment'
      });
    }

    const { content, post, parentComment } = req.body;

    // 验证文章是否存在
    const targetPost = await Post.findById(post);
    if (!targetPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // 创建评论
    const comment = await Comment.create({
      content,
      post: post,
      author: req.user.id,
      parentComment: parentComment || null
    });

    // 填充作者信息
    await comment.populate('author', 'username name avatar');

    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 获取文章的所有评论
exports.getPostComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
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

// 更新评论
exports.updateComment = async (req, res) => {
  try {
    let comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // 检查权限
    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { content: req.body.content },
      { new: true, runValidators: true }
    ).populate('author', 'username name avatar');

    res.status(200).json({
      success: true,
      data: comment
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

    // 检查权限
    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    // 删除子评论
    await Comment.deleteMany({ parentComment: req.params.id });

    // 删除评论
    await comment.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 点赞评论
exports.likeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // 检查用户是否已经点赞
    const alreadyLiked = comment.likes.some(
      like => like.toString() === req.user.id
    );

    if (alreadyLiked) {
      // 取消点赞
      comment.likes = comment.likes.filter(
        like => like.toString() !== req.user.id
      );
    } else {
      // 添加点赞
      comment.likes.push(req.user.id);
    }

    await comment.save();

    res.status(200).json({
      success: true,
      likes: comment.likes.length,
      data: comment.likes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
