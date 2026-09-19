const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    maxlength: [50, 'Username cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    // 注意:`[\w-]{2,4}` 这种「顶级域 2-4 位」的写法会拒掉一大堆合法地址
    // (`foo+bar@gmail.com`、`x@github.local`、`.museum` 之类长顶级域),
    // 而 passport 的 GitHub 兜底邮箱 `gh-<id>@github.local` 与 OAuth2 的 `${provider.id}-<uid>@oauth.local`
    // 都被它挡在建号之外 —— 所以这里放宽为「本地部分 + 至少一段域名点分」。
    maxlength: [254, 'Please provide a valid email'],
    match: [
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/,
      'Please provide a valid email'
    ]
  },
  githubId: {
    type: String,
    unique: true,
    sparse: true
  },

  // 第三方登录(GitHub 之外的通用 OAuth2/OIDC)绑定的身份:
  // (provider, providerUserId) 唯一,provider 即登录方式 id(见 services/oauthProviders.js)
  oauthAccounts: [
    {
      provider: { type: String, required: true },
      providerUserId: { type: String, required: true },
      linkedAt: { type: Date, default: Date.now }
    }
  ],
  // 同一份身份的「扁平化索引键」,形如 'gitee:123456'。
  // 唯一性必须靠这个**单一路径**的数组字段:MongoDB 不支持「一个复合索引里出现两条数组路径」,
  // 而 oauthAccounts.provider / oauthAccounts.providerUserId 恰好是同一个数组的两条路径,
  // 拿它们建复合唯一索引要么建不出来(静默失效)、要么按元素笛卡尔积误报 E11000 挡掉正常登录。
  // 单路径 multikey 唯一索引语义明确:每个元素各成一个键,跨文档不许重复。
  oauthKeys: {
    type: [String],
    default: undefined, // 不要给非第三方账号塞一个空数组(空数组会被索引成 undefined 键而互相冲突)
    select: false        // 内部索引用,不必回传到前端
  },
  name: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  avatar: {
    type: String
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  canComment: {
    type: Boolean,
    default: true
  },
  canLogin: {
    type: Boolean,
    default: true
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 同一个第三方身份只能属于一个账号:并发首登(两个标签页同时回调)靠这个唯一索引兜底,
// services/oauthProviders.js upsertUser 在 E11000 时会回读同一条记录。
// 单一路径(oauthKeys)+ sparse:没有该字段的历史用户/管理员不会进索引,不会互相冲突。
UserSchema.index({ oauthKeys: 1 }, { unique: true, sparse: true });

UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

module.exports = mongoose.model('User', UserSchema);
