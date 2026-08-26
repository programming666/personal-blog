const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Please provide comment content'],
    trim: true,
    maxlength: [100, '评论不能超过 100 个字符']
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  moderationStatus: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved',
    index: true
  },
  moderationReason: { type: String, default: '' },
  moderationModel: { type: String, default: '' },
  // AI 语气重写: isRewritten=true 时 content 为润色版,originalContent 保留原评论(仅后台/管理员可见)
  isRewritten: { type: Boolean, default: false, index: true },
  originalContent: { type: String, default: '' },
  // AI 自动重试计数:输出异常/调用失败时由 moderationQueueWorker 递增,超上限转人工
  moderationRetries: { type: Number, default: 0 }
}, {
  timestamps: true
});

// 获取评论时自动填充作者信息(含 role 用于前端 admin 徽章)
CommentSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'author',
    select: 'username name avatar role'
  });
  next();
});

module.exports = mongoose.model('Comment', CommentSchema);
