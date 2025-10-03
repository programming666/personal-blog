# Personal Blog

一个现代化的个人博客系统，基于React + Node.js + MongoDB构建，支持Markdown编辑、代码高亮、数学公式和文章缩略图功能。

## 🌟 功能特性

### 内容管理
- ✅ 富文本Markdown编辑器
- ✅ 代码高亮显示（支持多种编程语言）
- ✅ 数学公式支持（LaTeX语法）
- ✅ 文章标签分类系统
- ✅ 文章缩略图上传功能
- ✅ 文章状态管理（草稿/发布）

### 用户系统
- ✅ GitHub OAuth登录集成
- ✅ JWT身份验证
- ✅ 用户权限管理

### 技术特性
- ✅ 响应式设计，支持移动端
- ✅ 图片压缩优化（支持5MB限制）
- ✅ 快速构建和部署
- ✅ TypeScript支持
- ✅ 现代化的UI设计

## 🛠️ 技术栈

### 前端
- **React 19** + **TypeScript**
- **Vite** - 快速构建工具
- **Tailwind CSS** - 样式框架
- **React Router** - 路由管理
- **React Hook Form** - 表单处理
- **React Markdown** - Markdown渲染
- **KaTeX** - 数学公式渲染
- **Highlight.js** - 代码高亮

### 后端
- **Node.js** + **Express**
- **MongoDB** + **Mongoose**
- **JWT** - 身份验证
- **Multer** - 文件上传
- **Sharp** - 图片处理
- **Passport.js** - OAuth认证

### 部署
- **Vercel** - 前端部署
- **支持Linux生产环境**

## 🚀 快速开始

### 环境要求
- Node.js 18+
- MongoDB 4.4+
- Git

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/programming666/personal-blog
cd personal-blog
```

2. **安装后端依赖**
```bash
cd backend
npm install
```

3. **安装前端依赖**
```bash
cd ../frontend
npm install
```

4. **环境配置**

创建`backend/.env`文件：
```env
PORT=端口
MONGODB_URI=链接字符串
JWT_SECRET=密钥
GITHUB_CLIENT_ID=客户端ID
GITHUB_CLIENT_SECRET=客户端密钥
FRONTEND_URL=前端URL
TURNSTILE_SECRET_KEY=Cloudflare Turnstile密钥
TURNSTILE_SITE_KEY=Cloudflare Turnstile站点密钥
ADMIN_USERNAME=管理员用户名
ADMIN_PASSWORD=管理员密码
```

创建`frontend/.env`文件：
```env
VITE_API_URL=后端API URL
VITE_TURNSTILE_SITE_KEY=Cloudflare Turnstile站点密钥
```

5. **启动开发服务器**

后端：
```bash
cd backend
npm run dev
```

前端：
```bash
cd frontend
npm run dev
```

## 📁 项目结构

```
personal-blog/
├── backend/                 # 后端API
│   ├── controllers/         # 控制器
│   ├── middleware/         # 中间件
│   ├── models/            # 数据模型
│   ├── routes/            # 路由定义
│   ├── uploads/           # 上传文件存储
│   └── server.js         # 服务器入口
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/   # React组件
│   │   ├── pages/       # 页面组件
│   │   ├── services/    # API服务
│   │   └── styles/      # 样式文件
│   └── uploads/         # 临时上传文件
└── README.md
```

## 🎯 主要功能说明

### 文章管理
- **创建文章**：支持Markdown编辑，实时预览
- **编辑文章**：支持修改所有字段，包括缩略图
- **删除文章**：软删除机制
- **文章列表**：支持分页和标签筛选

### 图片上传
- **缩略图功能**：每篇文章可设置缩略图
- **图片压缩**：自动压缩到800x600，质量85%
- **文件限制**：最大5MB，支持JPG/PNG/GIF/WebP
- **路径管理**：自动保存到`/uploads`目录

### 数学公式
- **KaTeX集成**：支持行内和块级公式
- **LaTeX语法**：完整的数学表达式支持
- **实时渲染**：编辑时即时预览

### 代码高亮
- **语言支持**：JavaScript、Python、HTML、CSS等
- **主题定制**：支持多种代码主题
- **行号显示**：可选的行号显示功能

## 🚢 部署指南

### 生产环境部署

1. **构建前端**
```bash
cd frontend
npm run build
```

2. **启动后端**
```bash
cd backend
npm start
```

3. **配置反向代理**（可选）
使用Nginx配置前端和后端的反向代理。

### Vercel部署

1. 连接GitHub仓库到Vercel
2. 配置构建命令：`npm run build`
3. 配置输出目录：`dist`
4. 添加环境变量

## 🔧 开发规范

### 代码风格
- 使用TypeScript进行类型检查
- ESLint代码规范检查
- Prettier代码格式化

### Git规范
- 使用语义化提交信息
- 功能分支开发
- 代码审查流程

## 📄 许可证

MIT License - 详见[LICENSE](LICENSE)文件

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 邮箱：[your-email@example.com]
- GitHub Issues：[项目Issues页面]

---

⭐ 如果这个项目对你有帮助，请给个Star！
