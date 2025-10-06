const mongoose = require('mongoose');

const BroadcastMessageSchema = new mongoose.Schema({
  // 广播标题
  title: {
    type: String,
    required: [true, '请提供广播标题'],
    trim: true,
    maxlength: [100, '标题不能超过100个字符']
  },
  // 广播内容
  content: {
    type: String,
    required: [true, '请提供广播内容'],
    maxlength: [2000, '内容不能超过2000个字符']
  },
  // 发送者（管理员ID或管理员标识）
  sender: {
    type: String,
    required: true,
    default: 'admin'
  },
  // 发送状态
  status: {
    type: String,
    enum: ['pending', 'sending', 'completed', 'failed'],
    default: 'pending'
  },
  // 目标用户总数
  totalRecipients: {
    type: Number,
    default: 0
  },
  // 成功发送数量
  successCount: {
    type: Number,
    default: 0
  },
  // 失败发送数量
  failedCount: {
    type: Number,
    default: 0
  },
  // 发送进度百分比
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // 发送开始时间
  startedAt: {
    type: Date
  },
  // 发送完成时间
  completedAt: {
    type: Date
  },
  // 错误信息
  errorMessage: {
    type: String
  },
  // 重试次数
  retryCount: {
    type: Number,
    default: 0
  },
  // 最大重试次数
  maxRetries: {
    type: Number,
    default: 3
  },
  // 发送详情（用于追踪每个用户的发送状态）
  sendDetails: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    },
    error: String,
    sentAt: Date,
    retryCount: {
      type: Number,
      default: 0
    }
  }],
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新updatedAt字段
BroadcastMessageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 计算进度的方法
BroadcastMessageSchema.methods.calculateProgress = function() {
  if (this.totalRecipients === 0) return 0;
  const processed = this.successCount + this.failedCount;
  return Math.round((processed / this.totalRecipients) * 100);
};

// 更新进度的方法
BroadcastMessageSchema.methods.updateProgress = function() {
  this.progress = this.calculateProgress();
  if (this.progress === 100) {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  return this.save();
};

module.exports = mongoose.model('BroadcastMessage', BroadcastMessageSchema);