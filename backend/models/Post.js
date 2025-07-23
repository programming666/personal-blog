const mongoose = require('mongoose');
const slugify = require('slugify');

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  slug: {
    type: String,
    unique: true
  },
  content: {
    type: String,
    required: [true, 'Please provide content'],
  },
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt cannot be more than 500 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  thumbnail: {
    type: String,
    default: ''
  },
  published: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['published', 'draft'],
    default: 'published'
  },
  publishedAt: {
    type: Date,
    default: Date.now
  },
  viewCount: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟关联评论
PostSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
  justOne: false
});

// 生成slug
PostSchema.pre('save', function(next) {
  if (!this.isModified('title')) {
    next();
  }
  this.slug = slugify(this.title, { lower: true }) + '-' + Math.random().toString(36).substr(2, 5);
  next();
});

// 删除文章时删除关联评论
PostSchema.pre('remove', async function(next) {
  await this.model('Comment').deleteMany({ post: this._id });
  next();
});

module.exports = mongoose.model('Post', PostSchema);
