# UI 重设计验证记录

日期：2026-10-05。分支：`feat/editorial-ui`。未自动提交或推送。

## 已实现

- A「纸感编辑部」公共布局：首页、文章、公告、友链、登录、OAuth 回调和法律页面。
- 独立后台工作台，保留 13 个管理模块及文章新建/编辑功能。
- 后台「外观与内容」：品牌、中英文首页文案、主题、文章布局、导航、页脚、Logo/Favicon。
- 独立草稿、桌面/移动及深浅预览、保存/取消、恢复默认外观、离开保护。
- `GET/PUT /api/admin/presentation` 与公共设置白名单；`site.presentation` 单独持久化。
- 站点标题、分享元信息和 Favicon 使用新配置，旧标题与媒体数据兼容。

## 验证命令与结果

```bash
node --test backend/tests/*.test.js frontend/tests/presentation.test.mjs frontend/tests/studio.test.cjs frontend/tests/public-editorial.test.mjs
node --check backend/server.js
npm --prefix frontend run build
git diff --check
```

结果：**79 个测试通过，0 失败**；后端语法、前端生产构建、差异空白检查通过。

测试运行环境 Node 26.10.0。`presentation.test.mjs` 直接导入 TypeScript，需支持原生类型擦除的 Node 版本（建议 Node 22.18+ 或更新版本）。

全量 `npm --prefix frontend run lint` 尚未通过：52 errors / 6 warnings，主要为原有 `@ts-nocheck`、未使用变量、Context 导出与 Hook 规则问题。新增 UI/配置模块定向 ESLint 检查通过，未全库禁用检查规则。

构建仍报告既有 `MarkdownEditorNew.tsx` 重复 `code` 键警告，以及当前 Node 的弃用提醒。

## 浏览器验收

Vite 地址：`http://127.0.0.1:5173`。

`frontend/tests/browser-smoke.playwright.js` 是可由 Playwright MCP `browser_run_code_unsafe` 加载的函数脚本；运行前先启动 Vite 5173。脚本使用同目录 `browser-fixtures.json`，对 API 和 Turnstile 进行浏览器级拦截，不访问生产数据、不完成真实第三方验证。

已验证：

- 首页、文章（含代码块）、公告、友链、登录、隐私、条款在 375/768/1440px 的实际加载后布局，无页面横向溢出。
- 设置草稿不提前写入；取消恢复；保存后刷新保留；浏览器标签标题跟随品牌。
- 后退时拒绝离开，草稿保留；此功能使用 React Router 原生 `useBlocker`。
- 预览桌面双栏、移动单栏；预览切换深色不污染真实站点。
- 工作台外观页面三种宽度无横向溢出。
- 移动导航可访问友链；移动首页深色模式无横向溢出。
- 深色编辑器工具栏使用深色设计变量，不再残留浅灰工具栏。
- 文章页标题与默认 Favicon 正常；移除旧手动高亮 effect 后无 `hljs is not defined` 报错。
- 主浏览器 smoke 最终结果 `errors: []`，一次明确保存写入。

截图位于被 Git 忽略的 `.playwright-mcp/`：

- `ui-home-desktop.png`
- `ui-appearance-desktop.png`
- `ui-appearance-mobile.png`
- `ui-home-mobile-dark.png`
- `ui-editor-dark.png`

## 集成说明

- `BrowserRouter` 改为等价根路由的 `createBrowserRouter` / `RouterProvider`，使原生导航拦截覆盖前进/后退。路径与认证业务保持不变。
- `SettingsProvider` 在 `ThemeProvider` 外层，未明确选择主题的访客使用站点默认模式；明确的系统/浅色/深色偏好优先。
- 公共页面与预览共享 `JournalHero`；预览设备布局显式限定，避免预览面板宽度与真实视口混淆。
- Logo/Favicon 继续即时上传，文字与主题使用显式保存。
- 上线需同时更新后端并重新构建前端；仅替换前端不会提供新增配置接口。
- 分享元信息延续服务端 30 秒缓存，配置保存后可能最多延迟 30 秒更新爬虫响应。
- 无配置文档时使用默认外观，无需数据迁移。

## 尚未进行的验证

- 未连接真实 MongoDB 做集成写入；数据库持久化路径通过 mock Mongoose 方法及真实 Express/JWT 权限中间件验证。
- 未真实执行 OAuth 提供方回调、Turnstile、2FA、邮件、AI 调用或生产上传/删除操作。
- 未自动部署或重启用户已有后端进程。
