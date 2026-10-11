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
  moderationRetries: { type: Number, default: 0 },
  // 真实被回复的评论:parentComment 强制扁平为一层评论;replyTo 保留用户实际点"回复"的那条,供 AI 审阅与前端 @ 展示
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }
}, {
  timestamps: true
});

// 获取评论时自动填充作者信息(含 role 用于前端 admin 徽章)。
// 刻意不 select `username`:这是全站评论唯一的作者来源,而 GET /api/comments/post/:id
// 是匿名可读的 —— 管理员一旦评论,ADMIN_USERNAME(线上是邮箱)就会被任何路人抓走。
// 展示名一律走 `name`(GitHub / OAuth 建号时都写了 name,管理员建号时是「系统管理员」,
// 线上实际值是 550W),前端 `author.name || author.username` 的回退链对这一改动无感。
// 注意:实测 pre('find') 钩子在 exec 时才跑,其 select 会**覆盖**调用方显式写的
// `.populate('author', 'username …')` —— 所以 admin.controller 里那份显式 populate
// 也只会拿到 name。后台界面同样优先渲染 name,不受影响。
CommentSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'author',
    select: 'name avatar role'
  });
  next();
});

module.exports = mongoose.model('Comment', CommentSchema);
