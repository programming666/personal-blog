# Personal Blog

一个面向单博主的轻量博客系统。后端 Express + MongoDB,前端 React 19 + Vite + TypeScript。
只有管理员能发文章;访客通过 GitHub OAuth 登录后可评论(≤100 字)和点赞;评论经过多层反滥用 + AI 审核才会公开显示。

## 功能概览

### 内容
- Markdown 编辑(代码高亮 + KaTeX 数学公式 + GFM)
- 文章缩略图自动压缩(Sharp,800×600 JPEG q85)
- 公告板(替代旧版站内信/广播),公开列表 + 置顶
- 站点 Logo 可在管理面板自定义上传

### 身份与权限
- **管理员**:用 `.env` 凭据登录,JWT 通过 **HttpOnly cookie** (`admin_token`) 下发,1h 过期,刷新仍保活;支持可选 **TOTP 2FA**(speakeasy + QR)
- **普通用户**:仅支持 **GitHub OAuth**,JWT 默认 30d,存 localStorage
- 发文章/编辑文章/删文章/管理后台:仅管理员
- GitHub 用户:仅评论与点赞,不能发文章

### 反滥用 / 反机器人
评论与点赞 API 上叠了多层防御(从外到内):

| 层 | 实现 | 作用 |
|---|---|---|
| UA 黑名单 | `blockBotUserAgent` | 拒绝 curl/wget/python-requests/scrapy/okhttp/headless 等典型机器人 UA |
| Origin/Referer | `checkOrigin` | 跨域写操作必须来自 `FRONTEND_URL` 或本地 dev origin |
| IP 速率 | `commentIpLimiter`/`commentDailyIpLimiter` | 评论 2/min、50/day per IP |
| 渐进延迟 | `commentSlowDown` (express-slow-down) | 越频繁响应越慢,最高 +4s |
| 用户速率 | `commentCreateLimiter`/`commentDailyUserLimiter` | 评论 2/min、50/day per user |
| 账号年龄 | `requireAccountAge` | 评论需账号 ≥60s、点赞 ≥10s,阻断"注册即喷" |
| Turnstile | `optionalTurnstile` | 配 Turnstile env 后开启 Cloudflare 人机验证 |
| Honeypot | 隐藏的 `_hp_field` | 机器人填表自动暴露,前端不可见 |
| 正文校验 | `validateCommentBody` | 去空、控制字符、单字符重复 ≥12 拦截 |
| 重复检测 | `detectDuplicateComment` | 同用户 1h 内 / 同帖 5min 内不能重复内容 |
| 点赞抖动抑制 | `limitLikeToggle` | 同用户对同目标 1h 内最多 5 次点赞/取消切换 |

点赞 IP 速率 40/min、用户 20/min、用户 300/day。所有限流走 `ipKeyGenerator`,IPv6 正常归并。

### AI 评论审核
通过 **Google AI Studio** 原生 API 调用 `gemma-4-31b-it` 与 `gemma-4-26b-a4b-it` 双模型。

- 多 key 轮询:`GEMINI_API_KEYS` 逗号分隔,每个 `(key, model)` 各自 **RPM=10 / RPD=1500** 滑动窗口
- 选 slot 时优先用量最低的组合,自动负载均衡
- 审核目标聚焦三类:**AI 生成内容**(模板化、过度规整、LLM 自暴露) / **机器人灌水**(空泛赞美、与正文无关、乱码) / **推广营销**(商业链接、加微信、SEO 关键词)
- 出三种 verdict:`approved` / `rejected` / `queued`
- 配额耗尽 → 标 `pending`,后台 `moderationQueueWorker` 每 30s 一轮扫待审,配额恢复自动出队
- AI 调用失败 / 输出无法解析 → 同样进队列等重试,不丢消息
- 未配 `GEMINI_API_KEYS` → 审核停用,评论直接发布
- 管理员可在「审核队列」面板看 **待审核 / 已拒绝 / 已通过** 三个 tab,手动通过/拒绝/重新调用 AI 重判,还能看到实时配额快照

公开列表 `getPostComments` 仅返回 `moderationStatus: 'approved'`,pending/rejected 对非管理员不可见。

## 技术栈

**后端** (`backend/`)
- Express 4 + Mongoose 8 (CommonJS)
- passport-github2 (OAuth)、jsonwebtoken、cookie-parser
- speakeasy (TOTP 2FA)
- multer + sharp (图片管线)
- express-rate-limit + express-slow-down
- axios (调 Gemini API)

**前端** (`frontend/`)
- React 19 + TypeScript + Vite (大多文件用 `// @ts-nocheck`)
- Tailwind v4 (`@tailwindcss/vite` + `@theme` 块) + `@tailwindcss/typography`
- React Router 6
- react-markdown + remark-math + rehype-katex + remark-gfm
- highlight.js
- qrcode.react (2FA 二维码)

## 快速开始

### 依赖
- Node.js 18+
- MongoDB 4.4+

### 安装与运行
```bash
git clone https://github.com/programming666/personal-blog
cd personal-blog

cd backend  && npm install
cd ../frontend && npm install
```

### 环境变量

**`backend/.env`**
```env
PORT=8089
MONGODB_URI=mongodb://localhost:27017/personal-blog
JWT_SECRET=随机长字符串
JWT_EXPIRE=30d                          # 可选,GitHub 用户 token 有效期

# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
# OAuth callback URL,二选一:
#   1) 直接给完整 URL (优先生效)
GITHUB_CALLBACK_URL=http://localhost:8089/api/auth/github/callback
#   2) 或者只给 BACKEND_URL,自动拼成 <BACKEND_URL>/api/auth/github/callback
# BACKEND_URL=https://api.your-domain.com
FRONTEND_URL=http://localhost:4173      # 用于 OAuth 回跳 + checkOrigin 校验

# Cloudflare Turnstile (可选 — 未填则跳过验证)
TURNSTILE_SECRET_KEY=...
TURNSTILE_SITE_KEY=...

# 管理员
ADMIN_USERNAME=admin@blog.example.com
ADMIN_PASSWORD=请改成强密码

# AI 评论审核 (可选 — 不填则审核停用,评论直接发布)
GEMINI_API_KEYS=key1,key2,key3          # 逗号分隔多 key
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:8089
VITE_TURNSTILE_SITE_KEY=...
```

### 启动开发服务器
```bash
# 终端 1
cd backend && npm run dev               # nodemon,默认监听 PORT (8089)

# 终端 2
cd frontend && npm run dev              # Vite,默认 5173
```

### 生产构建
```bash
cd frontend && npm run build            # tsc -b && vite build → dist/
cd backend  && npm start                # node server.js
```

## 项目结构

```
personal-blog/
├── backend/
│   ├── config/                # db / passport
│   ├── controllers/           # auth, admin, post, comment, announcement, settings
│   ├── middleware/
│   │   ├── auth.middleware.js          # protect 读 Bearer 或 admin_token cookie
│   │   ├── rateLimit.middleware.js     # 各路限流器
│   │   ├── antiAbuse.middleware.js     # UA/Origin/年龄/正文/重复/点赞抖动/honeypot
│   │   ├── turnstile.middleware.js
│   │   └── upload.middleware.js        # multer + sharp 图片/Logo 处理
│   ├── models/                # User, Post, Comment, Announcement, Setting
│   ├── routes/                # auth, admin, posts, comments, announcements, settings
│   ├── services/
│   │   ├── aiModeration.js             # Gemini 调用 + key×model 配额轮询
│   │   └── moderationQueueWorker.js    # 30s tick 重审 pending 评论
│   ├── scripts/
│   │   └── migrate-to-announcements.js # 一次性迁移旧消息系统
│   └── server.js
├── frontend/src/
│   ├── components/
│   │   ├── AdminPanel.tsx              # 7 个 tab
│   │   ├── AdminModerationQueue.tsx    # 待审/已拒/已通过 + 配额快照
│   │   ├── AdminSecurity.tsx           # 2FA 设置
│   │   ├── AdminSiteSettings.tsx       # Logo 上传
│   │   ├── AdminAnnouncements.tsx
│   │   ├── Navbar.tsx
│   │   └── TurnstileWidget.tsx
│   ├── context/
│   │   ├── AuthContext.tsx             # GitHub + admin (cookie) 双模式
│   │   ├── SettingsContext.tsx         # logo 等公共设置缓存
│   │   └── ThemeContext.tsx            # 暗色模式
│   ├── pages/
│   │   ├── HomePage / PostPage / LoginPage / AdminPage
│   │   ├── CreatePost / EditPost      # 仅 admin 可访问,非 admin 跳首页
│   │   ├── AnnouncementsPage
│   │   └── GitHubCallback / TermsPage / PrivacyPage / TeamPage
│   └── services/api.ts                # 单一 API 出口,withCredentials: true
└── README.md
```

## API 一览

挂载在 `server.js`:

| Prefix | 用途 |
|---|---|
| `/api/auth` | GitHub OAuth、`/me` |
| `/api/admin` | 登录、2FA、统计、用户/文章/评论管理、审核队列 |
| `/api/posts` | 文章 CRUD(写操作 admin 限定)、点赞 |
| `/api/comments` | 创建/编辑/删除/点赞 |
| `/api/announcements` | 公告 |
| `/api/settings` | Logo 等公开/管理员设置 |
| `/uploads/*` | 静态文件 |

前端单一调用出口:`frontend/src/services/api.ts`,任何端点变更同步更新这里。

## 管理员登录流程

1. `/admin` 输入 `ADMIN_USERNAME` / `ADMIN_PASSWORD`
2. 如果开启了 2FA → 服务器返回 5min 有效的 `ticket`,前端进入 2FA 输入页
3. 验证通过 → 服务器 `Set-Cookie: admin_token=<JWT>; HttpOnly; SameSite=Lax; Max-Age=3600; Path=/`,同时响应体里也返回 token 与 user 对象
4. 前端把 user 对象存 `localStorage.adminUser`(token 不暴露给 JS)
5. 刷新页面 → AuthContext 用 cookie 调 `/api/auth/me` 验证,恢复 admin 会话
6. 退出 → 调 `POST /api/admin/logout`,服务器 `clearCookie`

GitHub 用户走传统 `Authorization: Bearer` + localStorage token,默认 30 天。

## 一次性数据迁移

如果是从旧版「站内信 + 广播」体系升级:
```bash
cd backend
node scripts/migrate-to-announcements.js
```
脚本会把旧 `broadcastmessages` 转成 `announcements`、drop `messages`、剥掉用户表里已删除的字段。

## 已知约束

- GitHub OAuth callback URL 默认由 `GITHUB_CALLBACK_URL` 或 `BACKEND_URL` 推导,部署时需要同步更新 GitHub OAuth App 里的 Authorization callback URL
- 评论硬上限 100 字,在 `models/Comment.js` 与前端 `COMMENT_MAX` 常量同步
- 反滥用中的 like-toggle 抑制是单实例内存 Map,多副本部署需要换 Redis
- AI 审核配额追踪也是内存的(进程内 `Map`),重启即清零

## 许可证

NCRPL License — 详见 [LICENSE](LICENSE)。

## 联系

- Issues: https://github.com/programming666/personal-blog/issues
