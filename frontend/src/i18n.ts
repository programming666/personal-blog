// 轻量中英 i18n:切换语言即整页刷新(reload),t() 每次读 localStorage。
// 后台/隐私/条款保持中文(以中文版本为准),不在此字典范围内。
export type Lang = 'zh' | 'en';

const zh: Record<string, string> = {
  // 导航
  'nav.home': '首页',
  'nav.announcements': '公告',
  'nav.theme': '切换主题',
  'nav.admin': '管理后台',
  'nav.logout': '退出',
  'nav.login': '登录',
  // 首页
  'home.tagline': '个人技术博客',
  'home.heroTitle': '分享思考，记录成长',
  'home.heroSub': '技术分享、学习心得与日常思考，希望能给你带来一些启发。',
  'home.error': '无法加载文章列表，请稍后再试',
  'home.empty': '还没有文章',
  'home.emptySub': '作者正在准备中，敬请期待',
  'home.read': '阅读',
  'home.prev': '上一页',
  'home.next': '下一页',
  // 文章页
  'post.back': '返回文章列表',
  'post.notFound': '文章不存在或已被删除',
  'post.notFoundSub': '抱歉，我们无法找到您请求的文章。',
  'post.home': '返回首页',
  'post.edit': '编辑',
  'post.delete': '删除',
  'post.views': '阅读',
  'post.comments': '评论',
  'post.likes': '点赞',
  'post.liked': '已点赞',
  'post.like': '点赞',
  'post.loginCta': '登录后即可发表评论',
  'post.goLogin': '前往登录',
  'post.noComments': '暂无评论',
  'post.firstComment': '成为第一个评论的人吧',
  'post.publishComment': '发布评论',
  'post.publishing': '发布中…',
  'post.placeholder': '留下你的想法…（最多 {max} 字）',
  'post.placeholderAdmin': '管理员评论无字数上限，尽情发表',
  'post.reply': '回复',
  'post.replyPlaceholder': '回复 {name}…',
  'post.cancel': '取消',
  'post.send': '发送',
  'post.hpWebsite': '网站（请勿填写）',
  'post.confirmDeletePost': '确定要删除这篇文章吗？此操作不可恢复。',
  'post.likeFail': '点赞失败',
  'post.captcha': '请先完成人机验证',
  'post.submitted': '评论已进入审核队列（AI 自动重试中），通过后将公开显示',
  'post.rejected': '评论未通过审核',
  'post.submitFail': '评论提交失败',
  'post.replySubmitted': '回复已提交，正在审核中',
  'post.replyRejected': '回复未通过审核',
  'post.replyFail': '回复提交失败',
  'post.deleteFail': '删除失败，请稍后再试',
  'post.errorLoad': '无法加载文章内容，请稍后再试',
  'post.editFail': '修改评论失败，请稍后再试',
  'post.rewritten': '原评论语气不友善，内容经 AI 润色后展示',
  'post.showOriginal': '查看原文',
  'post.hideOriginal': '收起原文',
  'post.translated': 'AI 翻译',
  // 公告
  'ann.listError': '无法加载公告，请稍后再试',
  'ann.title': '站点公告',
  'ann.subtitle': '来自管理员的最新动态与通知',
  'ann.pinned': '置顶',
  'ann.empty': '暂无公告',
  'ann.emptySub': '敬请期待',
  // 友链
  'nav.friends': '友链',
  'friends.title': '友情链接',
  'friends.subtitle': '值得关注的好友与站点',
  'friends.loading': '加载中…',
  'friends.loadError': '无法加载友链，请稍后再试',
  'friends.empty': '暂无友链',
  // 登录
  'login.welcome': '欢迎回来',
  'login.subtitle': '使用 GitHub 账号继续，以发表评论',
  'login.github': '使用 GitHub 登录',
  'login.agree': '登录即表示同意我们的',
  'login.terms': '服务条款',
  'login.privacy': '隐私协议',
  // GitHub 回调
  'cb.processing': '正在处理 GitHub 登录…',
  'cb.redirect': '登录成功后即将返回…',
};

const en: Record<string, string> = {
  'nav.home': 'Home',
  'nav.announcements': 'Announcements',
  'nav.theme': 'Toggle theme',
  'nav.admin': 'Admin',
  'nav.logout': 'Log out',
  'nav.login': 'Sign in',
  'home.tagline': 'Personal Tech Blog',
  'home.heroTitle': 'Sharing thoughts, recording growth',
  'home.heroSub': 'Tech notes, learning logs and daily musings — hope they inspire you.',
  'home.error': 'Failed to load posts, please try again later',
  'home.empty': 'No posts yet',
  'home.emptySub': 'The author is preparing content — stay tuned',
  'home.read': 'Read',
  'home.prev': 'Previous',
  'home.next': 'Next',
  'post.back': 'Back to posts',
  'post.notFound': 'Post not found or deleted',
  'post.notFoundSub': "Sorry, we couldn't find the post you requested.",
  'post.home': 'Back to home',
  'post.edit': 'Edit',
  'post.delete': 'Delete',
  'post.views': 'views',
  'post.comments': 'Comments',
  'post.likes': 'Likes',
  'post.liked': 'Liked',
  'post.like': 'Like',
  'post.loginCta': 'Sign in to leave a comment',
  'post.goLogin': 'Sign in',
  'post.noComments': 'No comments yet',
  'post.firstComment': 'Be the first to comment',
  'post.publishComment': 'Publish',
  'post.publishing': 'Publishing…',
  'post.placeholder': 'Share your thoughts… (max {max})',
  'post.placeholderAdmin': 'Admin comments have no length limit',
  'post.reply': 'Reply',
  'post.replyPlaceholder': 'Reply to {name}…',
  'post.cancel': 'Cancel',
  'post.send': 'Send',
  'post.hpWebsite': 'Website (leave empty)',
  'post.confirmDeletePost': 'Delete this post? This cannot be undone.',
  'post.likeFail': 'Failed to like',
  'post.captcha': 'Please complete the human verification first',
  'post.submitted': 'Your comment is in the review queue (AI retrying); it will appear once approved',
  'post.rejected': 'Comment was not approved',
  'post.submitFail': 'Failed to submit comment',
  'post.replySubmitted': 'Reply submitted and under review',
  'post.replyRejected': 'Reply was not approved',
  'post.replyFail': 'Failed to submit reply',
  'post.deleteFail': 'Delete failed, please try again later',
  'post.errorLoad': 'Failed to load the post, please try again later',
  'post.editFail': 'Failed to edit comment, please try again later',
  'post.rewritten': 'Original comment was unfriendly; AI-polished version shown',
  'post.showOriginal': 'View original',
  'post.hideOriginal': 'Hide original',
  'post.translated': 'AI translation',
  'ann.listError': 'Failed to load announcements, please try again later',
  'ann.title': 'Announcements',
  'ann.subtitle': 'Latest news and notices from the admin',
  'ann.empty': 'No announcements',
  'ann.emptySub': 'Stay tuned',
  // friend links
  'nav.friends': 'Friends',
  'friends.title': 'Friend Links',
  'friends.subtitle': 'Friends and sites worth following',
  'friends.loading': 'Loading…',
  'friends.loadError': 'Failed to load friend links, please try again later',
  'friends.empty': 'No friend links yet',
  'login.welcome': 'Welcome back',
  'login.subtitle': 'Continue with your GitHub account to leave comments',
  'login.github': 'Sign in with GitHub',
  'login.agree': 'By signing in you agree to our',
  'login.terms': 'Terms of Service',
  'login.privacy': 'Privacy Policy',
  'cb.processing': 'Processing GitHub sign-in…',
  'cb.redirect': 'You will be redirected after sign-in…',
};

const dict: Record<Lang, Record<string, string>> = { zh, en };

const safeGet = (fn: () => string): string => {
  try {
    return fn();
  } catch {
    return 'zh';
  }
};

export const getLang = (): Lang => {
  const stored = safeGet(() => localStorage.getItem('lang') || '');
  if (stored === 'zh' || stored === 'en') return stored;
  // 默认识别:浏览器语言前缀 en → English,其余中文
  const nav = safeGet(() => navigator.language || 'zh').toLowerCase();
  return nav.startsWith('en') ? 'en' : 'zh';
};

export const setLang = (lang: Lang) => {
  try {
    localStorage.setItem('lang', lang);
  } catch {
    /* ignore */
  }
};

export const t = (key: string, vars?: Record<string, string | number>): string => {
  const lang = getLang();
  let s: string = dict[lang][key] ?? zh[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return s;
};

export const switchLang = (lang: Lang) => {
  setLang(lang);
  window.location.reload(); // 整页刷新让所有内容(含 AI 译文)按新语言重新加载
};