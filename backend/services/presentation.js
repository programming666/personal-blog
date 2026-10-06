const Setting = require('../models/Setting');

const PRESENTATION_KEY = 'site.presentation';
const PAPER_COLORS = ['#f6f4ec', '#faf7ef', '#f3f5f3'];

const defaultPresentation = (legacyTitle) => ({
  version: 1,
  brand: {
    name: {
      zh: typeof legacyTitle === 'string' && legacyTitle.trim() ? legacyTitle.trim().slice(0, 80) : '秦一宁',
      en: typeof legacyTitle === 'string' && legacyTitle.trim() ? '' : 'Qinyining'
    },
    description: { zh: '关于技术、创造，以及值得记住的小事。', en: 'On technology, making things, and moments worth keeping.' }
  },
  home: {
    eyebrow: { zh: '保持好奇，慢慢生长', en: 'NOTES ON BUILDING & LIVING' },
    title: { zh: '在代码之间，记录生活的回声。', en: 'Between code and everyday life.' },
    subtitle: { zh: '把探索写成文字，让想法在这里生长。', en: 'A journal of experiments, ideas, and everyday discoveries.' },
    authorName: '秦一宁',
    authorBio: { zh: '一个持续学习、记录与创造的人。', en: 'Always learning, writing, and building.' },
    showAuthor: true
  },
  theme: { accent: '#3c6857', paper: 'warm', headingFont: 'serif', mode: 'system' },
  posts: { layout: 'list', showCover: true, pageSize: 9 },
  navigation: [
    { id: 'home', label: { zh: '文章', en: 'Journal' }, visible: true },
    { id: 'announcements', label: { zh: '公告', en: 'Notes' }, visible: true },
    { id: 'friends', label: { zh: '友邻', en: 'Friends' }, visible: true }
  ],
  footer: {
    copyright: { zh: '© {year} {name}. 保持好奇，认真生活。', en: '© {year} {name}. Made with curiosity.' },
    filing: '',
    filingUrl: '',
    socials: []
  }
});

const text = (max, required = false) => ({ type: 'text', max, required });
const localized = (max, required = false) => ({ zh: text(max, required), en: text(max) });
const enumeration = (...values) => ({ type: 'enum', values });
const boolean = { type: 'boolean' };
const url = (required = false) => ({ type: 'url', required, max: 2048 });
const schema = {
  version: enumeration(1),
  brand: { name: localized(80, true), description: localized(300) },
  home: {
    eyebrow: localized(80), title: localized(120, true), subtitle: localized(400),
    authorName: text(80), authorBio: localized(600), showAuthor: boolean
  },
  theme: {
    accent: { type: 'color' }, paper: enumeration('warm', 'ivory', 'neutral'),
    headingFont: enumeration('serif', 'sans'), mode: enumeration('light', 'dark', 'system')
  },
  posts: { layout: enumeration('list', 'cards'), showCover: boolean, pageSize: enumeration(6, 9, 12, 18) },
  navigation: {
    type: 'array', min: 3, max: 3,
    item: { id: enumeration('home', 'announcements', 'friends'), label: localized(40, true), visible: boolean }
  },
  footer: {
    copyright: localized(200), filing: text(200), filingUrl: url(),
    socials: { type: 'array', max: 8, item: { label: text(40, true), url: url(true) } }
  }
};

const isPlainObject = value => value !== null && typeof value === 'object' &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const luminance = hex => {
  const channels = [1, 3, 5].map(start => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const contrast = (a, b) => {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

const validatePresentation = value => {
  const errors = Object.create(null);
  const reject = (path, message) => { errors[path || 'presentation'] = message; };
  const walk = (input, rule, path = '') => {
    if (!rule.type) {
      if (!isPlainObject(input)) {
        reject(path, '必须提供完整的配置对象');
        return {};
      }
      for (const key of Object.keys(input)) {
        if (!Object.hasOwn(rule, key)) reject(path ? `${path}.${key}` : key, '不支持此设置项');
      }
      return Object.fromEntries(Object.entries(rule).map(([key, child]) => [
        key, walk(Object.hasOwn(input, key) ? input[key] : undefined, child, path ? `${path}.${key}` : key)
      ]));
    }
    if (rule.type === 'array') {
      if (!Array.isArray(input)) {
        reject(path, '必须是列表');
        return [];
      }
      if (input.length > rule.max || input.length < (rule.min || 0)) {
        reject(path, rule.min === rule.max ? `必须包含 ${rule.max} 项` : `最多 ${rule.max} 项`);
      }
      return input.slice(0, rule.max).map((item, index) => walk(item, rule.item, `${path}.${index}`));
    }
    if (rule.type === 'boolean') {
      if (typeof input !== 'boolean') reject(path, '必须是开关值');
      return input;
    }
    if (rule.type === 'enum') {
      if (!rule.values.includes(input)) reject(path, `请选择有效值：${rule.values.join(' / ')}`);
      return input;
    }
    if (rule.type === 'color') {
      if (typeof input !== 'string' || !/^#[0-9a-f]{6}$/i.test(input)) {
        reject(path, '请使用六位十六进制颜色，例如 #3c6857');
      } else if (PAPER_COLORS.some(paper => contrast(input, paper) < 4.5)) {
        reject(path, '此颜色的文字对比度不足，请选择更深的颜色，例如 #3c6857');
      }
      return typeof input === 'string' ? input.toLowerCase() : input;
    }
    if (typeof input !== 'string') {
      reject(path, '必须是文本');
      return '';
    }
    const clean = input.trim();
    if (clean.length > rule.max) reject(path, `最多 ${rule.max} 个字符`);
    if (rule.required && !clean) reject(path, '此项不能为空');
    if (rule.type === 'url' && clean) {
      try {
        const parsed = new URL(clean);
        if (!/^https?:\/\//i.test(clean) || !['http:', 'https:'].includes(parsed.protocol) ||
          !parsed.hostname || parsed.username || parsed.password || /[\x00-\x20\x7f\\]/.test(clean)) {
          throw new Error('invalid URL');
        }
      } catch {
        reject(path, '请填写完整的 HTTP(S) 链接，不允许登录凭据或控制字符');
      }
    }
    return clean;
  };

  const clean = walk(value, schema);
  if (Array.isArray(clean.navigation)) {
    if (new Set(clean.navigation.map(item => item.id)).size !== 3) {
      reject('navigation', '文章、公告和友邻入口必须各包含一次');
    }
    clean.navigation.forEach((item, index) => {
      if (item.id === 'home' && item.visible !== true) reject(`navigation.${index}.visible`, '文章首页入口必须保留');
    });
  }
  if (Object.keys(errors).length) {
    const error = new Error('请检查外观设置中的错误');
    error.statusCode = 400;
    error.errors = errors;
    throw error;
  }
  return clean;
};

const getPresentation = async (documents) => {
  const docs = documents || await Setting.find({ key: { $in: [PRESENTATION_KEY, 'site.title'] } });
  const legacyTitle = docs.find(doc => doc.key === 'site.title')?.value;
  const stored = docs.find(doc => doc.key === PRESENTATION_KEY)?.value;
  if (stored) {
    try {
      return validatePresentation(stored);
    } catch {
      // 旧版或损坏的配置不直接进入公开响应，保留站点原有标题并回退到安全默认值。
    }
  }
  return defaultPresentation(legacyTitle);
};

const savePresentation = async input => {
  const value = validatePresentation(input);
  await Setting.findOneAndUpdate(
    { key: PRESENTATION_KEY },
    { $set: { value }, $setOnInsert: { key: PRESENTATION_KEY } },
    { new: true, upsert: true, runValidators: true }
  );
  return value;
};

module.exports = { PRESENTATION_KEY, defaultPresentation, validatePresentation, getPresentation, savePresentation };
