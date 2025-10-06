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
  moderationModel: { type: String, default: '' }
}, {
  timestamps: true
});

// 获取评论时自动填充作者信息
CommentSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'author',
    select: 'username name avatar'
  });
  next();
});

module.exports = mongoose.model('Comment', CommentSchema);
