const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '请提供公告标题'],
    trim: true,
    maxlength: [100, '标题不能超过100个字符']
  },
  content: {
    type: String,
    required: [true, '请提供公告内容'],
    maxlength: [5000, '内容不能超过5000个字符']
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  pinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

AnnouncementSchema.index({ pinned: -1, createdAt: -1 });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
