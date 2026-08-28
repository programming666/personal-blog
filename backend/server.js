const express = require('express');
const compression = require('compression');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
// 初始化 Express 应用
const app = express();
app.set('trust proxy', 1);
// L1: 不让响应头暴露底层框架
app.disable('x-powered-by');

// H1/M3: 严格 CSP + 点击劫持防护(全站,含 /api)
// - script: 仅本站 + Cloudflare Turnstile(前台评论区体验验证)
// - style: 允许内联(React 大量 style={{}} 内联样式)
// - frame-ancestors 'none': iframe 嵌入 /admin 与登录页一律拒绝
const CSP_HEADER = [
  "default-src 'self'",
  // Cloudflare Turnstile (前端评论区人机验证) + Cloudflare Web Analytics (beacon.min.js)
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://cloudflareinsights.com",
  "object-src 'none'",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', CSP_HEADER);
  next();
});
// 中间件配置
// CORS 白名单 — 严格允许 FRONTEND_URL + 可选 ALLOWED_ORIGINS,杜绝 origin: true 的反射:
// 旧逻辑会把任意 Origin 反射回 ACAO,配合 credentials: true 让任何站点的脚本
// 在管理员登录期间跨域读取 /api/admin/* 响应。
const corsAllowlist = [
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
]
  .filter(Boolean)
  .map((o) => o.replace(/\/$/, ''));

app.use(cors({
  origin: (origin, cb) => {
    // 同源 / 无浏览器 (curl, 服务端到服务端) — Origin 缺失,直接放行
    if (!origin) return cb(null, true);
    const normalized = origin.replace(/\/$/, '');
    if (corsAllowlist.includes(normalized)) return cb(null, true);
    // 不在白名单 — 返回 false 让 cors 中间件不写 ACAO 头,浏览器会自然拒绝
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
// 文本响应 gzip 压缩(HTML/JS/CSS/JSON 大幅瘦身,对移动端 LCP 显著)
app.use(compression());
// 静态文件服务
// 上传文件(图片)文件名带时间戳、内容不可变 → 长缓存 1 年(满足 efficient cache lifetime)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '365d', immutable: true }));
// 数据库连接
require('./config/db')();
// 初始化 Passport
require('./config/passport')(passport);
app.use(passport.initialize());
// 启动评论审核队列消费者
require('./services/moderationQueueWorker').start();
// 路由配置
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/posts', require('./routes/post.routes'));
app.use('/api/comments', require('./routes/comment.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/announcements', require('./routes/announcement.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/translate', require('./routes/translate.routes'));
app.use('/api/uploads', require('./routes/upload.routes'));

// 仅在 SERVE_FRONTEND=true 时,把前端 dist/ 也由 Express 服务
if (process.env.SERVE_FRONTEND === 'true') {
  const distPath = path.resolve(__dirname, '..', 'frontend', 'dist');
  // 缓存策略:
  //  - assets/* (哈希文件名,内容不变) → 1 年 immutable
  //  - index.html → no-cache (每次部署 chunk 哈希都变,旧 index.html 会引用失效的 chunk)
  //  - 其他非 asset 静态文件 → 7d
  app.use(express.static(distPath, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=604800');
      }
    }
  }));
  // ---- SEO:OG 标签 + favicon 注入 ----
  // SPA 是 CSR,爬虫/分享卡片读到的是 Express 返回的原始 HTML,
  // 所以对文章路径服务端查库后把 og:meta 注入 <head>,再返回给客户端。
  const escapeHtml = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  let indexHtmlCache = null;

  // 站点级 meta(title / favicon / logo)缓存 30s,避免每个请求都查库
  let siteMetaCache = null;
  let siteMetaCacheAt = 0;
  async function getSiteMeta() {
    if (siteMetaCache && Date.now() - siteMetaCacheAt < 30000) return siteMetaCache;
    const meta = { title: '个人博客', favicon: null, logo: null, description: '个人技术博客,记录学习与生活' };
    try {
      const Setting = require('./models/Setting');
      const docs = await Setting.find({ key: { $in: ['site.title', 'site.favicon', 'site.logo', 'site.description'] } });
      docs.forEach((d) => {
        if (d.key === 'site.title' && d.value) meta.title = String(d.value);
        if (d.key === 'site.favicon' && d.value) meta.favicon = String(d.value);
        if (d.key === 'site.logo' && d.value) meta.logo = String(d.value);
        if (d.key === 'site.description' && d.value) meta.description = String(d.value);
      });
      siteMetaCache = meta;
      siteMetaCacheAt = Date.now();
    } catch (e) {
      console.error('[seo] settings lookup failed', e.message);
    }
    return meta;
  }

  // markdown → 纯文本(OG description 用,去掉标题符号/链接/图片/代码标记等)
  function stripMarkdown(src) {
    if (!src) return '';
    return String(src)
      .replace(/```[\s\S]*?```/g, ' ')      // 代码块
      .replace(/`[^`]*`/g, ' ')               // 行内代码
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')  // 图片
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接 → 保留文字
      .replace(/^#{1,6}\s+/gm, '')           // ATX 标题
      .replace(/^\s*([-*_])(\s*){2,}\s*$/gm, '') // 分隔线
      .replace(/^\s*[-*+]\s+/gm, '')        // 无序列表
      .replace(/^\s*\d+\.\s+/gm, '')      // 有序列表
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // 粗体
      .replace(/\*([^*]+)\*/g, '$1')        // 斜体
      .replace(/~~([^~]+)~~/g, '$1')          // 删除线
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 文章路径 /posts/:id 或 /posts/:slug → 查库拿文章 meta;非文章路径用站点默认
  async function buildSeoMeta(req, siteMeta) {
    const base = `${req.protocol}://${req.get('host')}`;
    const m = req.path.match(/^\/posts\/([^/]+)/);
    const og = {
      title: siteMeta.title,
      description: siteMeta.description,
      image: siteMeta.logo ? `${base}/${siteMeta.logo}` : null,
      url: base + (req.path === '/' ? '' : req.path),
      type: 'website'
    };
    if (m) {
      try {
        const mongoose = require('mongoose');
        const Post = require('./models/Post');
        const idOrSlug = decodeURIComponent(m[1]);
        const idCond = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : null;
        const post = await Post.findOne(idCond ? { $or: [idCond, { slug: idOrSlug }] } : { slug: idOrSlug })
          .select('title slug excerpt content thumbnail images status')
          .maxTimeMS(3000);
        if (post && post.status === 'published') {
          og.title = post.title;
          og.description = stripMarkdown(post.excerpt || post.content || '').slice(0, 150);
          const img = post.thumbnail || (post.images && post.images[0]);
          if (img) og.image = img.startsWith('http') ? img : `${base}/${img.replace(/^\/+/, '')}`;
          og.url = `${base}/posts/${post.slug || post._id}`;
          og.type = 'article';
        }
      } catch (e) {
        console.error('[seo] post lookup failed', e.message);
      }
    }
    return og;
  }

  // 把 og meta + favicon 注入 index.html 模板
  function renderHtmlWithMeta(template, og, siteMeta, base) {
    const metaLines = [
      `<meta property="og:title" content="${escapeHtml(og.title)}" />`,
      `<meta property="og:description" content="${escapeHtml(og.description)}" />`,
      og.image ? `<meta property="og:image" content="${escapeHtml(og.image)}" />` : null,
      `<meta property="og:url" content="${escapeHtml(og.url)}" />`,
      `<meta property="og:type" content="${og.type}" />`,
      `<meta property="og:site_name" content="${escapeHtml(siteMeta.title)}" />`,
      `<meta property="og:locale" content="zh_CN" />`,
      `<meta name="twitter:card" content="${og.image ? 'summary_large_image' : 'summary'}" />`,
      `<meta name="twitter:title" content="${escapeHtml(og.title)}" />`,
      og.image ? `<meta name="twitter:image" content="${escapeHtml(og.image)}" />` : null,
      `<meta name="description" content="${escapeHtml(og.description)}" />`
    ].filter(Boolean).join('\n    ');
    let html = template
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(og.title)}</title>`)
      .replace('</head>', `    ${metaLines}\n  </head>`);
    // favicon:有自定义则替换 vite.svg
    if (siteMeta.favicon) {
      const faviconUrl = siteMeta.favicon.startsWith('http') ? siteMeta.favicon : `/${siteMeta.favicon.replace(/^\/+/, '')}`;
      html = html.replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${faviconUrl}" type="image/png" />`);
    }
    return html;
  }

  // SPA fallback — 仅对不存在对应静态文件的非 /api、非 /uploads 路径返回 index.html;
  // 缺失的哈希资源(asset 404)必须如实 404,否则会被缓存成 HTML 毒化 CDN/浏览器
  app.get(/^\/(?!api\/|uploads\/).*/, async (req, res) => {
    const candidate = path.join(distPath, req.path);
    if (req.path !== '/' && (path.extname(req.path) !== '' || fs.existsSync(candidate))) {
      return res.status(404).end();
    }
    // SPA fallback 返回 index.html 时强制 no-cache,避免浏览器缓存旧 index.html
    // 导致引用的 chunk hash 在下次部署后失效
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    try {
      const siteMeta = await getSiteMeta();
      const og = await buildSeoMeta(req, siteMeta);
      if (!indexHtmlCache) {
        indexHtmlCache = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
      }
      const base = `${req.protocol}://${req.get('host')}`;
      const html = renderHtmlWithMeta(indexHtmlCache, og, siteMeta, base);
      res.send(html);
    } catch (err) {
      console.error('[seo] fallback render failed', err.message);
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}
// 健康检查
// 健康检查 — L2: 不暴露 uptime / 进程运行时长(& 其他仅运维需知信息则从日志查)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ok',
    timestamp: new Date().toISOString()
  });
});
// 错误处理中间件(M5):统一脱敏,不向客户端泄露内部细节
app.use((err, req, res, next) => {
  // express.json() 体解析失败 → 400(而不是 500)
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    return res.status(400).json({ success: false, message: '请求体不是合法的 JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: '请求体过大' });
  }
  // mongoose 无效 ObjectId → 400(不再回显 CastError 堆栈/模型名)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: '无效的内容 ID' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: '文件过大' });
  }
  console.error('[error]', req.method, req.originalUrl, err.message);
  // 生产(含线上拼错的 NODE_ENV=productions)一律脱敏;本地开发保留原始 message 便于调试
  const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'productions';
  res.status(err.status || 500).json({
    success: false,
    message: isProd ? '服务器内部错误' : (err.message || '服务器内部错误')
  });
});
// 启动服务器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
module.exports = app;