const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { buildSync } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');

function loadStudio() {
  const root = path.resolve(__dirname, '..');
  const result = buildSync({
    stdin: {
      contents: "export { default } from './src/components/StudioLayout'; export { studioGroups } from './src/utils/studioNavigation'; export { ThemeProvider } from './src/context/ThemeContext';",
      resolveDir: root,
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    define: { 'import.meta.env': '{}' },
    loader: { '.css': 'empty' },
    jsx: 'automatic',
    logLevel: 'silent',
  });
  const compiled = new Module(path.join(__dirname, 'studio.compiled.cjs'), module);
  compiled.filename = path.join(__dirname, 'studio.compiled.cjs');
  compiled.paths = module.paths;
  compiled._compile(result.outputFiles[0].text, compiled.filename);
  return compiled.exports;
}

function renderStudio(props) {
  const { default: StudioLayout, ThemeProvider } = loadStudio();
  return renderToStaticMarkup(React.createElement(MemoryRouter, null,
    React.createElement(ThemeProvider, null,
      React.createElement(StudioLayout, props, React.createElement('p', null, '工作区内容')))));
}

test('all thirteen existing admin modules remain reachable in grouped navigation', () => {
  const { studioGroups } = loadStudio();
  const ids = studioGroups.flatMap(group => group.items.map(item => item.id));
  assert.equal(new Set(ids).size, 13);
  assert.deepEqual([...ids].sort(), ['stats', 'users', 'posts', 'comments', 'moderation', 'announcements', 'settings', 'oauth', 'profile', 'security', 'aimodel', 'translate', 'friendlinks'].sort());
});

test('management layout renders active module, mobile disclosure and workspace', () => {
  const html = renderStudio({ title: '文章管理', activeTab: 'posts', onSelectTab() {}, onLogout() {} });
  assert.match(html, /aria-current="page"[^>]*>.*?文章管理/s);
  assert.match(html, /aria-controls="studio-navigation"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /工作区内容/);
  assert.match(html, /退出登录/);
  assert.match(html, /href="\/"/);
});

test('editor layout navigation links back to matching admin module', () => {
  const html = renderStudio({ title: '撰写文章', activeTab: 'posts' });
  assert.match(html, /href="\/admin\?tab=posts"/);
  assert.doesNotMatch(html, /退出登录/);
});
