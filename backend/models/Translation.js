// 翻译缓存:把 zh/en 译文直接持久化到 MongoDB,后续取译文一律先查库,不再走 localStorage。
// 唯一索引 (sourceType, sourceId, lang) 保证同一条内容同一语言只有一份译文。
const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      enum: ['post', 'comment', 'announcement'],
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    field: {
      type: String,
      enum: ['title', 'body'],
      required: true,
    },
    lang: {
      type: String,
      enum: ['zh', 'en'],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

translationSchema.index({ sourceType: 1, sourceId: 1, field: 1, lang: 1 }, { unique: true });

module.exports = mongoose.model('Translation', translationSchema);