# 纸感编辑部实现计划

> **面向 AI 代理的工作者：** 使用 executing-plans 逐任务实现本计划，测试先行；不自动提交。

**目标：** 全站编辑式 UI 与可持久化受控外观配置。
**架构：** Setting.site.presentation 保存版本化展示配置，公共设置白名单输出，SettingsContext 提供给前台与工作台；共享设计变量和独立预览作用域。
**技术栈：** Express/Mongoose、React 19、TypeScript、Tailwind 4、Node 内建测试、浏览器验证。

## 数据契约

```ts
type Localized = { zh: string; en: string };
type Presentation = {
  version: 1;
  brand: { name: Localized; description: Localized };
  home: { eyebrow: Localized; title: Localized; subtitle: Localized; authorName: string; authorBio: Localized; showAuthor: boolean };
  theme: { accent: string; paper: 'warm'|'ivory'|'neutral'; headingFont: 'serif'|'sans'; mode: 'light'|'dark'|'system' };
  posts: { layout: 'list'|'cards'; showCover: boolean; pageSize: 6|9|12|18 };
  navigation: { id: 'home'|'announcements'|'friends'; label: Localized; visible: boolean }[];
  footer: { copyright: Localized; filing: string; filingUrl: string; socials: { label: string; url: string }[] };
};
```

公共设置返回原格式 `data['site.presentation']`。管理员 `GET/PUT /api/admin/presentation` 返回 `{success:true,data:Presentation}`。PUT 请求体直接为 Presentation；字段错误返回 400 `{success:false,message,errors:{'theme.accent':'...'}}`。默认强调色 #3c6857，背景 warm，标题 serif，模式 system，列表 9 条。

## 任务 1：配置后端

文件：新增 backend/services/presentation.js、backend/tests/presentation.test.js；修改 backend/controllers/settings.controller.js、backend/routes/admin.routes.js。

- [x] 使用 node:test 测试默认值、未知字段、长度、枚举、导航唯一性、URL、对比度；先运行失败。
- [x] 实现 defaultPresentation/validatePresentation/getPresentation/savePresentation；在服务层仅访问单独键。
- [x] 管理员路由复用现有认证和权限；公共接口只扩展展示键白名单。
- [x] 测试控制器的成功、400、500 与数据隔离；运行 `node --test backend/tests/presentation.test.js`。

```js
const assert = require('node:assert/strict');
const test = require('node:test');
const { defaultPresentation, validatePresentation } = require('../services/presentation');
test('default presentation passes validation', () => assert.deepEqual(validatePresentation(defaultPresentation()), defaultPresentation()));
test('rejects script URLs', () => {
  const value = defaultPresentation();
  value.footer.socials = [{label:'bad',url:'javascript:alert(1)'}];
  assert.throws(() => validatePresentation(value));
});
```

## 任务 2：前端配置与主题

文件：新增 frontend/src/utils/presentation.ts、frontend/tests/presentation.test.mjs；修改 SettingsContext.tsx、ThemeContext.tsx、services/api.ts、index.css。

- [x] 先测试英文回退、旧标题兼容、颜色变量、默认值独立拷贝与导航映射。
- [x] 提供 defaultPresentation、normalizePresentation、localized(value,lang)、presentationStyle；使用上述固定字段契约。
- [x] SettingsContext 暴露 presentation、refresh、loading、error，保留原属性；成功刷新更新，失败保留旧值。
- [x] ThemeContext 区分访客显式偏好与站点默认；系统主题变化可响应。
- [x] 引入暖纸/深墨设计变量与基础控件，保留现有工具类兼容性。

## 任务 3：前台

文件：Navbar.tsx、App.tsx、HomePage.tsx、PostPage.tsx、LoginPage.tsx、FriendsPage.tsx、AnnouncementsPage.tsx、TermsPage.tsx、PrivacyPage.tsx、OAuthCallback.tsx；新增 SiteFooter.tsx、JournalHero.tsx、styles/journal.css。

- [x] 先定义浏览器验收：首页配置标题、列表/卡片、页脚、移动菜单和非首页阅读布局。
- [x] Navbar 与 Footer 消费配置；隐藏导航不改变路由权限。
- [x] HomePage 将 limit 改为 presentation.posts.pageSize；布局/封面依据配置，保留翻译/分页/请求行为。
- [x] 提取 JournalHero 供正式首页与设置预览共同使用；禁止将原型虚构数据带入正式页面。
- [x] 为其余所有公共页面添加统一页眉与阅读容器，保留业务逻辑。
- [x] 运行前端 build，并用浏览器验证 375/768/1440 宽度。

## 任务 4：后台

文件：AdminPanel.tsx、AdminPage.tsx、CreatePost.tsx、EditPost.tsx；新增 styles/studio.css；现有 Admin*.tsx 按需更新。

- [x] 先定义浏览器验收：13 模块入口全部可达、后台无前台导航、移动导航可操作。
- [x] 分组侧栏、工作台页头、列表和表单统一；无业务删除、无假统计。
- [x] 管理列表的加载和失败可见；文章编辑保留 Markdown 与上传流程。
- [x] 所有后台子组件以工作台设计变量统一，拆分仅与本次改版相关结构。

## 任务 5：外观编辑

文件：新增 components/AdminAppearance.tsx、components/AppearancePreview.tsx；AdminSiteSettings.tsx 保留媒体管理作为子区。

- [x] 先测试草稿修改不影响当前设置、取消回滚、恢复只修改 theme/posts。
- [x] 分组表单覆盖全部契约字段；本地不可变更新，字段错误映射。
- [x] 提供预览宽度和主题切换；预览作用域 CSS 不污染全站。
- [x] 保存调用 PUT，成功刷新设置并替换草稿，失败保留草稿；导航/关闭保护未保存内容。
- [x] 媒体区标注上传立即生效。

## 任务 6：回归

- [x] 运行后端与前端测试、frontend build、frontend lint，记录基线问题。
- [x] 启动 Vite，浏览器检查浅/深主题及三种宽度，记录控制台错误。
- [x] 使用浏览器隔离 mock 接口验证后台配置交互，不更改生产数据。
- [x] 审查 git diff，检查敏感数据、路由权限、公开配置、无图片/长标题退化。

## 基线

2026-10-05 frontend build 通过；既有 MarkdownEditorNew.tsx 重复 code 键产生 Vite 警告。初始代码无用户修改，仅本次原型与规格文件未跟踪。保持当前工作区，不自动创建新 worktree、不提交、不推送。
