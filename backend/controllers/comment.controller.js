const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { moderateComment, applyVerdictToComment } = require('../services/aiModeration');
const { invalidateSource } = require('../services/aiTranslate');

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

    // 回复扁平化:回复最多嵌套一层(一层评论下直接挂所有回复)。
    // parentComment 永远指向一层评论;replyTo 保留用户实际点"回复"的那条,供 AI 审阅与前端 @ 展示
    let storeParent = parentComment || null;
    let replyTo = parentComment || null;
    let replyToCtx = null;
    if (parentComment) {
      const replyTarget = await Comment.findById(parentComment).populate('author', 'username name');
      if (replyTarget) {
        if (replyTarget.parentComment) storeParent = replyTarget.parentComment; // 被回复的也是一条回复 → 提升挂到一层评论下
        replyToCtx = { content: replyTarget.content, authorName: replyTarget.author?.name || replyTarget.author?.username || '' };
      } else {
        storeParent = null; replyTo = null;
      }
    }
    // 调 AI 审核 — admin 评论免审
    const isAdmin = req.user.role === 'admin';
    let verdict;
    if (isAdmin) {
      verdict = { status: 'approved', reason: 'admin bypass' };
    } else {
      verdict = await moderateComment(content, { article: { title: targetPost.title, content: targetPost.content }, replyTo: replyToCtx });
    }

    const comment = new Comment({
      content,
      parentComment: storeParent,
      replyTo,
      post,
      author: req.user._id,
      moderationStatus: verdict.status,
      moderationReason: verdict.reason || '',
      moderationModel: verdict.model || ''
    });
    // 管理员豁免 100 字上限(schema maxlength 不适用于 admin),其余字段验证照常
    if (isAdmin) {
      await comment.save({ validateBeforeSave: false });
    } else {
      await comment.save();
    }
    // 语气不友善且有实质内容时,applyVerdictToComment 会用 AI 重写版替换 content 并保留原文
    applyVerdictToComment(comment, verdict, content);
    if (comment.isModified()) await comment.save();

    await comment.populate('author', 'username name avatar role');

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
        message: '评论已进入审核队列(AI 自动重试中),通过后将公开显示',
        data: comment
      });
    }
    return res.status(201).json({
      success: true,
      moderationStatus: 'approved',
      data: comment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

exports.getPostComments = async (req, res) => {
  try {
    const filter = {
      post: req.params.postId,
      moderationStatus: 'approved'
    };
    const comments = await Comment.find(filter).sort({ createdAt: -1 }).populate('replyTo', 'username name avatar');
    res.status(200).json({ success: true, count: comments.length, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
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
      // 管理员豁免 100 字上限,其余用户仍受 schema 限制
      { new: true, runValidators: req.user.role !== 'admin' }
    ).populate('author', 'username name avatar role');

    // 内容已变更,失效旧译文缓存,下次访问按需重译
    await invalidateSource('comment', comment._id);

    res.status(200).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
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
    res.status(500).json({ success: false, message: '服务器内部错误' });
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
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};
