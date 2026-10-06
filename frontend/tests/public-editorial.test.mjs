import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// NODE_PATH may point at the main checkout when running in a dependency-free worktree.
const require = createRequire(path.join(process.env.EDITORIAL_DEPENDENCY_ROOT || root, 'package.json'));
const { build } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const presentation = {
  brand: { name: { zh: '自定义刊物', en: 'Custom Journal' }, description: { zh: '品牌描述', en: '' } },
  home: { eyebrow: { zh: '记录与思考', en: '' }, title: { zh: '自定义主标题', en: 'A custom heading' }, subtitle: { zh: '自定义副标题', en: '' }, authorName: '作者名称', authorBio: { zh: '作者介绍', en: '' }, showAuthor: true },
  navigation: [{ id: 'home', label: { zh: '文章', en: 'Journal' }, visible: true }, { id: 'friends', label: { zh: '隐藏友链', en: '' }, visible: false }, { id: 'announcements', label: { zh: '动态', en: '' }, visible: true }],
  footer: { copyright: { zh: '自定义版权', en: '' }, filing: '备案文字', filingUrl: 'https://example.com/filing', socials: [{ label: 'GitHub', url: 'https://github.com/example' }] }
};

async function render(file, props = {}, lang = 'zh') {
  const mocks = {
    SettingsContext: `export const useSettings=()=>(${JSON.stringify({ presentation, logoPath: null })});`,
    AuthContext: `export const useAuth=()=>({user:null,logout:()=>{}});`,
    ThemeContext: `export const useTheme=()=>({mode:'system',isDarkMode:false,toggleTheme:()=>{}});`,
    i18n: `export const getLang=()=>${JSON.stringify(lang)}; export const t=k=>k;export const switchLang=()=>{};`,
    presentation: `export const localized=(v,l='zh')=>v?.[l]||v?.zh||v?.en||'';export const navigationPaths={home:'/',announcements:'/announcements',friends:'/friends'};export const safePublicUrl=v=>/^https?:\\/\\//.test(v||'');`
  };
  const built = await build({
    entryPoints: [path.join(root, 'src', file)], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
    external: ['react', 'react-dom', 'react-router-dom', 'react-icons/fa'], define: { 'import.meta.env.VITE_API_URL': '""' },
    plugins: [{ name: 'context-fixtures', setup(b) {
      b.onResolve({ filter: /(?:SettingsContext|AuthContext|ThemeContext|i18n|utils\/presentation)$/ }, args => ({ path: args.path.split('/').at(-1), namespace: 'fixture' }));
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path], loader: 'js' }));
      b.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' }));
    } }]
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', built.outputFiles[0].text)(require, mod, mod.exports);
  return renderToStaticMarkup(React.createElement(MemoryRouter, {}, React.createElement(mod.exports.default, props)));
}

test('hero renders configured bilingual content and optional author', async () => {
  const html = await render('components/JournalHero.tsx', { presentation, lang: 'en' }, 'en');
  assert.match(html, /A custom heading/);
  assert.match(html, /自定义副标题/);
  assert.match(html, /作者名称/);
  const hidden = await render('components/JournalHero.tsx', { presentation: { ...presentation, home: { ...presentation.home, showAuthor: false } } });
  assert.doesNotMatch(hidden, /作者介绍/);
});

test('navigation uses configured branding and hides disabled destinations', async () => {
  const html = await render('components/Navbar.tsx');
  assert.match(html, /自定义刊物/);
  assert.match(html, /动态/);
  assert.doesNotMatch(html, /隐藏友链/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-current="page"/);
});

test('footer renders configured safe links and legal navigation', async () => {
  const html = await render('components/SiteFooter.tsx');
  assert.match(html, /自定义版权/);
  assert.match(html, /备案文字/);
  assert.match(html, /https:\/\/github.com\/example/);
  assert.match(html, /noopener noreferrer/);
  assert.match(html, /href="\/privacy"/);
});
