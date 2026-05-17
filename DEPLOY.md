# 部署指南 — Ubuntu 24.04

本指南把 Personal Blog 完整跑在一台全新 Ubuntu 24.04 LTS 服务器上：
**Node.js + MongoDB + PM2 + Nginx + Let's Encrypt HTTPS**,并配通 GitHub OAuth、Cloudflare Turnstile、Gemini API 等可选项。

---

## 拓扑

```
互联网 ── 443/80 ──► Nginx ─┬─► /api/*       ─► localhost:8089 (Node + Express via PM2)
                            ├─► /uploads/*   ─► localhost:8089 (静态文件 by Express)
                            └─► /            ─► /var/www/blog/dist (Vite 构建产物)

MongoDB on localhost:27017 (仅本机访问)
```

部署建议:用 **单域名 + 路径** 暴露 (推荐, cookie sameSite=Lax 不用想跨站问题),或 **双子域** (blog.example.com + api.example.com, 同 site 也 OK)。本文按 **单域名** `blog.example.com` 写,双子域请看末尾「替代方案」。

### ⚠️ 关键概念:前后端是两个独立组件

| 组件 | 是什么 | 由谁运行 | 开机自启 |
|------|--------|----------|----------|
| **后端** | Node 进程,Express 监听 8089 | PM2 (systemd 子进程) | `pm2 startup` 注册后 ✓ |
| **前端** | `dist/` 里的静态 HTML/CSS/JS,**没有进程** | Nginx 直接 serve 硬盘 | apt 安装 Nginx 默认 ✓ |
| **数据库** | MongoDB | systemd | `systemctl enable mongod` 后 ✓ |

后端**不会**自动构建或拉起前端。前端任何改动都必须手动 `cd frontend && npm run build`(或跑 `deploy.sh`)重新生成 `dist/`,Nginx 才能 serve 到新内容。
PM2 只管 `backend/server.js` 这一个 Node 进程。

---

## 0. 服务器准备

```bash
# 1) 创建非 root 部署用户
sudo adduser deploy
sudo usermod -aG sudo deploy
su - deploy

# 2) 更新系统
sudo apt update && sudo apt upgrade -y

# 3) 基本工具
sudo apt install -y curl wget gnupg ca-certificates lsb-release \
    build-essential git ufw fail2ban

# 4) 防火墙 — 只放 SSH / 80 / 443
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 5) (可选) 加 swap, 给 MongoDB 缓冲
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 1. 安装 Node.js 20 LTS

用 NodeSource 仓库,版本管理更省心。

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node -v   # 应输出 v20.x.x
npm -v
```

---

## 2. 安装 MongoDB 7.0

Ubuntu 24.04 (noble) 在写本指南时尚未在 MongoDB 官方源 path 列表中,但 jammy (22.04) 的包能直接工作 — 这是 MongoDB 官方推荐做法。

```bash
# 导入 GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# 添加仓库 (用 jammy 兼容包)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

# 启动 + 开机自启
sudo systemctl enable --now mongod
sudo systemctl status mongod   # active (running) 即成功

# 验证
mongosh --eval 'db.runCommand({ ping: 1 })'
```

### MongoDB 安全收紧

默认监听 `127.0.0.1` (本地),足够我们用。若想再加把锁(强烈建议生产环境启用认证):

```bash
# 1) 创建管理员账户
mongosh <<'EOF'
use admin
db.createUser({
  user: "admin",
  pwd: "改成强随机密码",
  roles: [ { role: "root", db: "admin" } ]
})
EOF

# 2) 创建应用专用账户
mongosh <<'EOF'
use personal-blog
db.createUser({
  user: "blog",
  pwd: "另一个强随机密码",
  roles: [ { role: "readWrite", db: "personal-blog" } ]
})
EOF

# 3) 开启认证
sudo sed -i 's/#security:/security:\n  authorization: enabled/' /etc/mongod.conf
sudo systemctl restart mongod
```

之后 `MONGODB_URI=mongodb://blog:密码@127.0.0.1:27017/personal-blog?authSource=personal-blog`

---

## 3. 拉代码 + 安装依赖

```bash
sudo mkdir -p /var/www/blog
sudo chown deploy:deploy /var/www/blog
cd /var/www
git clone https://github.com/programming666/personal-blog blog
cd blog

# 后端依赖
cd backend
npm ci --omit=dev   # 生产环境装运行时依赖即可

# 前端依赖 + 构建
cd ../frontend
npm ci
# 先配置 frontend/.env 再 build (见下一节)
```

---

## 4. GitHub OAuth 应用配置

### 4.1 在 GitHub 创建 OAuth App

1. 浏览器登录 GitHub → 右上角头像 → **Settings** → 左下 **Developer settings** → **OAuth Apps** → **New OAuth App**
2. 填写:
   - **Application name**: `Personal Blog` (或你的站点名)
   - **Homepage URL**: `https://blog.example.com`
   - **Application description**: 随便填
   - **Authorization callback URL**: `https://blog.example.com/api/auth/github/callback` ← **必须** 精确匹配后端 `GITHUB_CALLBACK_URL`
3. 提交后会拿到 **Client ID**(明文展示)
4. 点 **Generate a new client secret** → 拿到 **Client Secret** → 复制保存(只显示一次)
5. 想加站点 logo 顺便上传

### 4.2 (可选) Cloudflare Turnstile

`https://dash.cloudflare.com` → Turnstile → Add site → 拿 **Site Key** 和 **Secret Key**。

### 4.3 (可选) Google AI Studio API keys

`https://aistudio.google.com/apikey` → Create API key → 复制。可创建多个分散到不同 Google 账号,提升每日配额。

---

## 5. 配置 .env

### `backend/.env`

```bash
cd /var/www/blog/backend
cp .env.example .env
nano .env
```

按下方填(注意 `NODE_ENV=production` 会让 admin cookie 加上 `Secure` 标志):

```env
PORT=8089
NODE_ENV=production
MONGODB_URI=mongodb://blog:你的密码@127.0.0.1:27017/personal-blog?authSource=personal-blog
JWT_SECRET=用 openssl rand -hex 48 生成
JWT_EXPIRE=30d

GITHUB_CLIENT_ID=粘贴 Client ID
GITHUB_CLIENT_SECRET=粘贴 Client Secret
GITHUB_CALLBACK_URL=https://blog.example.com/api/auth/github/callback
FRONTEND_URL=https://blog.example.com

TURNSTILE_SECRET_KEY=可选,留空跳过
TURNSTILE_SITE_KEY=可选

ADMIN_USERNAME=admin@blog.example.com
ADMIN_PASSWORD=用 openssl rand -base64 24 生成,务必强密码

GEMINI_API_KEYS=key1,key2,key3        # 可选,逗号分隔
# 国内服务器调 Gemini 走代理时填(支持 socks5/http,可带认证):
# GEMINI_PROXY=socks5://127.0.0.1:1080
```

生成强随机值:
```bash
openssl rand -hex 48     # JWT_SECRET
openssl rand -base64 24  # ADMIN_PASSWORD / MongoDB 密码
```

### `frontend/.env`

```bash
cd /var/www/blog/frontend
cp .env.example .env
nano .env
```

```env
VITE_API_URL=https://blog.example.com
VITE_TURNSTILE_SITE_KEY=可选,要和后端 TURNSTILE_SECRET_KEY 配对
```

### 构建前端

```bash
cd /var/www/blog/frontend
npm run build     # 产物在 dist/
```

---

## 6. PM2 管理后端进程

### 6.1 安装 PM2

```bash
sudo npm install -g pm2
```

### 6.2 进程配置

在仓库根目录建 `ecosystem.config.js`:

```bash
cd /var/www/blog
nano ecosystem.config.js
```

写入:

```js
module.exports = {
  apps: [
    {
      name: 'blog-backend',
      cwd: '/var/www/blog/backend',
      script: 'server.js',
      instances: 1,                // 单实例 — antiAbuse/aiModeration 用进程内内存
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/blog/err.log',
      out_file: '/var/log/blog/out.log',
      time: true
    }
  ]
};
```

> ⚠️ **单实例必须**。本项目的反滥用(点赞抖动 Map)、AI 审核配额追踪都用进程内内存,多实例会让限流穿透。如要横向扩展,先把这些迁到 Redis 再说。

### 6.3 启动 + 开机自启

```bash
sudo mkdir -p /var/log/blog
sudo chown deploy:deploy /var/log/blog

cd /var/www/blog
pm2 start ecosystem.config.js
pm2 logs blog-backend       # 看启动日志,Ctrl-C 退出
pm2 status

# 开机自启
pm2 save
pm2 startup systemd
# 会打印一条 sudo env ... systemctl ... 的命令,复制执行,把 PM2 注册到 systemd
```

### 6.4 常用 PM2 命令

```bash
pm2 list                    # 进程清单
pm2 logs blog-backend       # 实时日志 (滚动)
pm2 logs blog-backend --lines 200    # 看最近 200 行
pm2 restart blog-backend    # 重启
pm2 reload blog-backend     # 零停机重启 (cluster 模式才有意义)
pm2 stop blog-backend
pm2 delete blog-backend
pm2 monit                   # 终端面板,CPU/内存/event loop 实时
pm2 flush                   # 清空日志文件
```

---

## 7. Nginx 反向代理

### 7.1 安装

```bash
sudo apt install -y nginx
```

### 7.2 站点配置

```bash
sudo nano /etc/nginx/sites-available/blog
```

```nginx
# 80 → 443 强制跳转
server {
    listen 80;
    listen [::]:80;
    server_name blog.example.com;

    # certbot 验证留缝
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS 主站
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name blog.example.com;

    # 证书路径占位 — 等会用 certbot 自动填
    ssl_certificate     /etc/letsencrypt/live/blog.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/blog.example.com/privkey.pem;

    # 安全头
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 单文件上传上限 (含图片缩略图)
    client_max_body_size 12M;

    # 前端 SPA
    root /var/www/blog/frontend/dist;
    index index.html;

    # /api/* 与 /uploads/* 走后端
    location /api/ {
        proxy_pass http://127.0.0.1:8089;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 60s;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8089;
        proxy_set_header Host $host;
        # 上传图片可缓存
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }

    # 静态资源长缓存
    location ~* \.(js|css|woff2?|ttf|svg|png|jpg|jpeg|gif|webp|ico)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 7.3 启用 + 测试

```bash
sudo ln -s /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t                # 测试配置
sudo systemctl reload nginx
```

### 7.4 DNS

去你的域名服务商把 `blog.example.com` 的 **A 记录** 指向服务器公网 IP。等 DNS 生效(可用 `dig blog.example.com +short` 验证)。

---

## 8. Let's Encrypt HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx -d blog.example.com \
    --non-interactive --agree-tos --email you@example.com --redirect

# 测试自动续期 (会模拟跑一次)
sudo certbot renew --dry-run
```

certbot 会自动改写 Nginx 配置里的证书路径并加上 OCSP stapling。续期 cron 由 `certbot.timer` systemd 单元负责,不用手动管。

---

## 9. 首次部署后的连通性测试

```bash
# 1) 后端健康
curl https://blog.example.com/api/posts

# 2) 前端首页
curl -I https://blog.example.com/

# 3) Admin 登录 (Set-Cookie 应该有 admin_token; HttpOnly; Secure)
curl -i -X POST https://blog.example.com/api/admin/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://blog.example.com" \
  -d '{"username":"admin@blog.example.com","password":"你的密码"}'

# 4) GitHub OAuth 走一遍 — 浏览器开 https://blog.example.com/login → 点 GitHub 按钮
```

如果 OAuth 跳转回来报 `redirect_uri_mismatch`,核对 GitHub OAuth App 里的 callback URL 和 backend `.env` 的 `GITHUB_CALLBACK_URL` 是否**完全一致**(连尾斜杠都得对齐)。

---

## 10. 后续运维

### 更新代码

```bash
cd /var/www/blog
git pull --no-rebase origin main

# 后端
cd backend && npm ci --omit=dev
pm2 restart blog-backend

# 前端
cd ../frontend && npm ci && npm run build
# nginx 直接 serve dist/,无需 reload
```

把上面整合成脚本 `/var/www/blog/deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /var/www/blog
git pull --no-rebase --tags origin main
( cd backend  && npm ci --omit=dev )
( cd frontend && npm ci && npm run build )
pm2 restart blog-backend
echo "Deploy complete: $(date)"
```

```bash
chmod +x /var/www/blog/deploy.sh
```

之后只跑 `./deploy.sh`。

### 日志位置

| 服务 | 路径 |
|------|------|
| 后端 stdout | `/var/log/blog/out.log` |
| 后端 stderr | `/var/log/blog/err.log` |
| PM2 自身    | `~/.pm2/pm2.log` |
| Nginx 访问  | `/var/log/nginx/access.log` |
| Nginx 错误  | `/var/log/nginx/error.log` |
| MongoDB    | `/var/log/mongodb/mongod.log` |

日志轮转(避免无限增长):

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 14
```

### MongoDB 备份

```bash
sudo mkdir -p /var/backups/mongo
sudo chown deploy:deploy /var/backups/mongo

# 手动一次
mongodump --uri="mongodb://blog:密码@127.0.0.1:27017/personal-blog?authSource=personal-blog" \
  --out=/var/backups/mongo/$(date +%F)

# 自动 — crontab -e 加一行,每天 3 点跑
0 3 * * * mongodump --uri="..." --out=/var/backups/mongo/$(date +\%F) && \
          find /var/backups/mongo -maxdepth 1 -mtime +14 -type d -exec rm -rf {} +
```

### 一次性数据迁移 (旧版升级)

如果服务器上已经跑过老版的「站内信 + 广播」体系,首次部署后跑:

```bash
cd /var/www/blog/backend
node scripts/migrate-to-announcements.js
```

会:把旧 `broadcastmessages` 转成 `announcements`、drop `messages` 集合、剥掉用户表里已删除的字段。脚本幂等,跑多次无害。

---

## 11. 常见坑

| 现象 | 原因 / 处理 |
|------|-------------|
| 改了前端代码、`pm2 restart` 后浏览器没变 | PM2 只重启后端 Node 进程,**不**自动构建前端。必须 `cd frontend && npm run build` 重建 `dist/`,Nginx 才会 serve 到新内容 |
| GitHub OAuth `redirect_uri_mismatch` | OAuth App 的 callback URL 与 `GITHUB_CALLBACK_URL` 不完全相同 |
| Admin 登录 200 但刷新页面就退出 | `NODE_ENV=production` 让 cookie 加了 Secure,但你还在 HTTP 测试。开 HTTPS 或临时 `NODE_ENV=development` |
| 评论被 `请求来源不受信任` 拒 | `FRONTEND_URL` 没填,或填错了协议/域名,导致 `checkOrigin` 不放行 |
| `Cannot find module 'cookie-parser'` | 用了 `--omit=dev` 但缺包。`cookie-parser` 是运行时依赖,正常应在 `dependencies` 里;检查 `package.json` |
| 上传图片 413 Request Entity Too Large | Nginx 默认 1M 上限,本配置已加 `client_max_body_size 12M` |
| AI 审核 prompt 一直 `pending` | 检查 `GEMINI_API_KEYS` 是否填了、网络能否出去访问 `generativelanguage.googleapis.com` |
| `pm2: command not found` 重启后没了 | `pm2 startup` 后没执行它打印的 `sudo env ...` 命令;补跑一次 |

---

## 12. 替代方案 — 双子域部署

如果偏好 `blog.example.com` (前端) + `api.example.com` (后端) 分离:

1. **前端 .env**:`VITE_API_URL=https://api.example.com`
2. **后端 .env**:`FRONTEND_URL=https://blog.example.com`、`GITHUB_CALLBACK_URL=https://api.example.com/api/auth/github/callback`、`BACKEND_URL=https://api.example.com`
3. **GitHub OAuth App** callback URL 改为 `https://api.example.com/api/auth/github/callback`
4. **Nginx**:两个 server 块,分别 listen 443、各自有证书 (`certbot -d blog.example.com -d api.example.com`)
5. **Cookie 跨域**:由于 `blog.example.com` 和 `api.example.com` 是同 site (同 eTLD+1 `example.com`),`sameSite=Lax` cookie 仍然在第一方导航时生效。但 fetch/XHR 跨子域请求需要 cookie 的话,要把 cookie 改为 `sameSite='none'; secure: true`,并确保前后端在 HTTPS。修改 `backend/controllers/admin.controller.js` 的 `cookieOptions()`。

单域名部署省心,生产环境建议默认走单域名。

---

## 13. 一键摘要 (TL;DR)

```bash
# 服务器
sudo apt update && sudo apt install -y curl git nginx ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
# MongoDB 见第 2 节

# 代码
sudo mkdir -p /var/www/blog && sudo chown $USER /var/www/blog
git clone https://github.com/programming666/personal-blog /var/www/blog
cd /var/www/blog/backend  && cp .env.example .env && nano .env && npm ci --omit=dev
cd /var/www/blog/frontend && cp .env.example .env && nano .env && npm ci && npm run build

# 进程
sudo npm i -g pm2
pm2 start ecosystem.config.js && pm2 save && pm2 startup

# Nginx + HTTPS
sudo nano /etc/nginx/sites-available/blog   # 用第 7 节模板
sudo ln -s /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d blog.example.com --redirect
```

---

## 14. 不用 Nginx 的方案

三种替代,各有取舍。

### 14.1 Caddy — 最接近 Nginx 的替代

Caddy 自带 Let's Encrypt **自动签发 + 自动续期**,配置文件比 Nginx 短一个数量级,适合"想要一个反代但讨厌 Nginx DSL"的场景。

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
  sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
  sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

把 Caddy 配置写到 `/etc/caddy/Caddyfile`:

```caddy
blog.example.com {
    root * /var/www/blog/frontend/dist
    encode gzip zstd

    # /api/* 和 /uploads/* 反代到后端
    @backend path /api/* /uploads/*
    reverse_proxy @backend 127.0.0.1:8089

    # 单文件上传上限(对应 Nginx 的 client_max_body_size)
    request_body {
        max_size 12MB
    }

    # SPA fallback + 静态文件
    try_files {path} /index.html
    file_server

    # 安全头
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # 静态资源长缓存
    @assets path /assets/* /fonts/*
    header @assets Cache-Control "public, max-age=2592000, immutable"
}
```

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy   # 首次启动会自动申请 Let's Encrypt 证书
```

确保 DNS 已经把 `blog.example.com` 解析到服务器,且 80/443 端口对外开放。Caddy 会在启动时自动签发,**不用** certbot。

**取舍**:配置极简、HTTPS 全自动;但 Caddy 在国内服务器对 ACME challenge 偶尔有抽风,部分网络下首签可能要重试或先放开 80 端口对外。

---

### 14.2 让 Express 自己 serve 前端 + Cloudflare Tunnel

如果**不想开 80/443 端口**(避免被扫端口、不想搞证书、想要 DDoS 防护),最简方案是 **Express 同进程 serve 静态前端 + Cloudflare Tunnel 暴露**。

#### 步骤 1: 让 Express serve 前端 dist

把 `backend/server.js` 路由部分改成:

```js
// ... 现有路由保持不动 ...

// 路由配置(原有的几个 app.use 不变)
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/posts', require('./routes/post.routes'));
app.use('/api/comments', require('./routes/comment.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/announcements', require('./routes/announcement.routes'));
app.use('/api/settings', require('./routes/settings.routes'));

// 仅在 SERVE_FRONTEND=true 时,把前端 dist/ 也由 Express 服务
if (process.env.SERVE_FRONTEND === 'true') {
  const path = require('path');
  const distPath = path.resolve(__dirname, '..', 'frontend', 'dist');
  // 静态资源 — 加 7d 缓存
  app.use(express.static(distPath, { maxAge: '7d', index: false }));
  // SPA fallback — 所有非 /api、非 /uploads 的请求都返回 index.html
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 错误处理中间件(保持不动)
app.use((err, req, res, next) => { ... });
```

在 `backend/.env` 加:
```env
SERVE_FRONTEND=true
```

后端进程现在同时服务 API + 静态前端。

> ⚠️ 此时前端 `VITE_API_URL` 应填**与外部访问相同的域名**(例如 `https://blog.example.com`),或留空走相对路径。

#### 步骤 2: 用 Cloudflare Tunnel 暴露

无需开放服务器的 80/443 端口,流量从 Cloudflare 边缘出站连接到本地。

```bash
# 安装 cloudflared (Ubuntu 24.04)
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
rm cloudflared.deb

# 登录(浏览器打开授权页,选择你的域名)
cloudflared tunnel login

# 创建隧道
cloudflared tunnel create blog
# 输出会显示 Tunnel ID 与 credentials 路径 ~/.cloudflared/<uuid>.json
```

写 `~/.cloudflared/config.yml`:
```yaml
tunnel: <你的-tunnel-id>
credentials-file: /home/deploy/.cloudflared/<你的-tunnel-id>.json

ingress:
  - hostname: blog.example.com
    service: http://127.0.0.1:8089
  - service: http_status:404
```

把域名指向隧道(自动写 CNAME):
```bash
cloudflared tunnel route dns blog 'blog.example.com'
```

注册成 systemd 服务:
```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

到这一步,**整套架构只剩两个进程**:
- `pm2:blog-backend` — Express(API + 静态前端)
- `cloudflared` — Cloudflare 隧道

服务器**无需任何入站端口**(连 22 都可以只走 Cloudflare WARP)。Cloudflare 自动提供 HTTPS + CDN + DDoS 防护。

**取舍**:架构最简,免证书运维,自带 CDN;但所有流量必须经过 Cloudflare,且 Node 单进程做静态文件性能比 Nginx 差几倍 — 小流量个人博客足够,真高 QPS 还是 Nginx/Caddy。`/uploads/*` 的图片如果量大可考虑搬到对象存储。

---

### 14.3 单进程裸跑 + 自己上 HTTPS

如果连 Caddy/Tunnel 都不想装,把 Express 直接监听 443 也能跑(配合上面 14.2 的 SERVE_FRONTEND 改动):

```env
PORT=443
NODE_ENV=production
SERVE_FRONTEND=true
```

但 Node 监听 1024 以下端口需要 root 或 `setcap`:
```bash
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

HTTPS 证书需要自己用 `certbot certonly --standalone` 拿一份 PEM,再让 Express 通过 `https.createServer({ cert, key }, app).listen(443)` 起。证书续期时要短暂停掉 Express。

**不推荐**这条路 —— 没有反代/CDN 缓冲,且 Node 进程一旦崩了整个站直接挂。仅在玩具/内网场景下用。

---

## 15. 选型决策树

```
是否需要 HTTPS?
├─ 是
│  ├─ 想要 CDN/DDoS 防护、不想开端口  → 14.2 Cloudflare Tunnel + Express
│  ├─ 想要极简配置、ACME 一键搞定     → 14.1 Caddy
│  └─ 想要最高性能、灵活规则          → 第 7~8 节 Nginx + certbot (推荐)
└─ 否(纯内网/已有上游负载均衡)
   └─ 14.3 Express 裸跑 / Tunnel 内网模式
```

完。
