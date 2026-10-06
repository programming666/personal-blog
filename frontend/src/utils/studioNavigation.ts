import { FaBullhorn, FaChartBar, FaCog, FaComments, FaFileAlt, FaKey, FaLanguage, FaLink, FaRobot, FaShieldAlt, FaUser, FaUsers } from 'react-icons/fa';

export const studioGroups = [
  { label: '工作台', items: [
    { id: 'stats', name: '统计概览', icon: FaChartBar, description: '内容与读者，一目了然。' },
  ] },
  { label: '内容管理', items: [
    { id: 'posts', name: '文章管理', icon: FaFileAlt, description: '整理你的文字，让每一次表达都值得被看见。' },
    { id: 'comments', name: '评论管理', icon: FaComments, description: '阅读反馈，保持真诚的交流。' },
    { id: 'moderation', name: '审核队列', icon: FaShieldAlt, description: '逐条审阅，维护友好的讨论空间。' },
    { id: 'announcements', name: '公告管理', icon: FaBullhorn, description: '把重要的消息，传达给每一位读者。' },
    { id: 'friendlinks', name: '友链管理', icon: FaLink, description: '连接有趣的人，与值得阅读的网站。' },
  ] },
  { label: '站点设计', items: [
    { id: 'settings', name: '外观与内容', icon: FaCog, description: '从文字到颜色，让这里成为你的数字空间。' },
    { id: 'oauth', name: '登录方式', icon: FaKey, description: '配置读者使用的第三方登录入口。' },
  ] },
  { label: '系统与账户', items: [
    { id: 'users', name: '用户管理', icon: FaUsers, description: '查看读者账户，管理访问与评论权限。' },
    { id: 'profile', name: '个人资料', icon: FaUser, description: '维护你的公开身份与个人信息。' },
    { id: 'security', name: '安全', icon: FaShieldAlt, description: '保护管理账户，设置双重验证。' },
    { id: 'aimodel', name: 'AI 审核', icon: FaRobot, description: '管理内容审核使用的模型与规则。' },
    { id: 'translate', name: '翻译队列', icon: FaLanguage, description: '让文字跨越语言，查看翻译处理状态。' },
  ] },
];
