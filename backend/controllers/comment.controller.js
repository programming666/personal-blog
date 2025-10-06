const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { moderateComment } = require('../services/aiModeration');

exports.createComment = async (req, res) => {
  try {
    if (req.user.canComment === false) {
      return res.status(403).json({ success: false, message: '已被禁止评论' });
    }

    const { content, post, parentComment } = req.body;

    const targetPost = await Post.findById(post);
    if (!targetPost) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // 调 AI 审核 — admin 评论免审
    let verdict;
    if (req.user.role === 'admin') {
      verdict = { status: 'approved', reason: 'admin bypass' };
    } else {
      verdict = await moderateComment(content);
    }

    const comment = await Comment.create({
      content,
      post,
      author: req.user._id,
      parentComment: parentComment || null,
      moderationStatus: verdict.status,
      moderationReason: verdict.reason || '',
      moderationModel: verdict.model || ''
    });

    await comment.populate('author', 'username name avatar');

    if (verdict.status === 'rejected') {
      return res.status(200).json({
        success: true,
        moderationStatus: 'rejected',
        message: `评论未通过审核: ${verdict.reason || '内容不合规'}`
      });
    }
    if (verdict.status === 'pending') {
      return res.status(202).json({
        success: true,
        moderationStatus: 'pending',
        message: '评论已提交，正在审核中，通过后将公开显示',
        data: comment
      });
    }
    return res.status(201).json({
      success: true,
      moderationStatus: 'approved',
      data: comment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPostComments = async (req, res) => {
  try {
    const filter = {
      post: req.params.postId,
      moderationStatus: 'approved'
    };
    const comments = await Comment.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: comments.length, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateComment = async (req, res) => {
  try {
    let comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this comment' });
    }

    comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { content: req.body.content },
      { new: true, runValidators: true }
    ).populate('author', 'username name avatar');

    res.status(200).json({ success: true, data: comment });
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

    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    await Comment.deleteMany({ parentComment: req.params.id });
    await comment.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.likeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    // 隐藏的评论不可点赞
    if (comment.moderationStatus !== 'approved') {
      return res.status(403).json({ success: false, message: '评论暂不可操作' });
    }

    const userId = req.user._id.toString();
    const idx = comment.likes.findIndex((l) => l.toString() === userId);
    if (idx >= 0) {
      comment.likes.splice(idx, 1);
    } else {
      comment.likes.push(req.user._id);
    }
    await comment.save();

    res.status(200).json({
      success: true,
      liked: idx < 0,
      count: comment.likes.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
