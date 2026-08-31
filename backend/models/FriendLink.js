const mongoose = require('mongoose');

// 友链(Friend Link)
const friendLinkSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, '站点名称不能为空'], trim: true, maxlength: 100 },
    url: { type: String, required: [true, '链接地址不能为空'], trim: true, maxlength: 500 },
    description: { type: String, default: '', trim: true, maxlength: 300 },
    // 可选头像/logo(外部 URL 或 /uploads/... 路径)
    avatar: { type: String, default: '', trim: true, maxlength: 500 },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // 对方站点是否已放本站链接(可选标记)
    reciprocal: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// 校验 url 格式(允许 http/https 或相对路径)
friendLinkSchema.pre('validate', function (next) {
  const u = this.url;
  if (u && !/^(https?:\/\/|\/)/i.test(u)) {
    this.url = `https://${u}`;
  }
  next();
});

module.exports = mongoose.model('FriendLink', friendLinkSchema);
