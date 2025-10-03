const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  // 消息标题
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  // 消息内容
  content: {
    type: String,
    required: [true, 'Please provide content'],
    maxlength: [1000, 'Content cannot be more than 1000 characters']
  },
  // 发送者（管理员）
  sender: {
    type: String,
    default: 'admin',
    required: true
  },
  // 接收者（用户ID或邮箱）
  recipient: {
    type: String,
    required: [true, 'Please provide a recipient']
  },
  // 接收者类型（user_id 或 email）
  recipientType: {
    type: String,
    enum: ['user_id', 'email', 'username'],
    required: true
  },
  // 是否已读
  isRead: {
    type: Boolean,
    default: false
  },
  // 是否已删除（软删除）
  isDeleted: {
    type: Boolean,
    default: false
  },
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  // 读取时间
  readAt: {
    type: Date
  }
});

// 在保存前设置读取时间
MessageSchema.pre('save', function(next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('Message', MessageSchema);