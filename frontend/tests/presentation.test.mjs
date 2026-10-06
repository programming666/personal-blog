import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const backend = require('../../backend/services/presentation.js');
import { defaultPresentation, normalizePresentation, localized, presentationStyle, resetAppearance, updateDraft, resolveThemeMode } from '../src/utils/presentation.ts';

test('frontend and backend defaults use exactly the same contract', () => {
  assert.deepEqual(defaultPresentation(), backend.defaultPresentation());
});
test('defaults use editorial layout and do not share mutable objects', () => {
  const first = defaultPresentation();
  first.brand.name.zh = 'changed';
  assert.notEqual(defaultPresentation().brand.name.zh, 'changed');
  assert.equal(defaultPresentation().posts.layout, 'list');
});
test('English falls back to Chinese, including whitespace-only English', () => {
  assert.equal(localized({zh:'文字',en:''}, 'en'), '文字');
  assert.equal(localized({zh:'文字',en:'  '}, 'en'), '文字');
  assert.equal(localized({zh:'文字',en:'Journal'}, 'en'), 'Journal');
});
test('missing presentation preserves legacy site title', () => {
  assert.equal(normalizePresentation(undefined, '原站点').brand.name.zh, '原站点');
});
test('partial saved presentation receives defaults without losing explicit false', () => {
  const p = normalizePresentation({ home: {showAuthor:false}, posts: {showCover:false} });
  assert.equal(p.home.showAuthor, false);
  assert.equal(p.posts.showCover, false);
  assert.equal(p.theme.accent, '#3c6857');
});
test('unsafe styles and links cannot escape public normalization', () => {
  const p = normalizePresentation({ theme:{accent:'red;display:none'}, footer:{socials:[{label:'bad',url:'javascript:alert(1)'}]} });
  assert.equal(p.theme.accent, '#3c6857');
  assert.deepEqual(p.footer.socials, []);
});
test('unknown inherited paper names fall back to warm paper', () => {
  assert.equal(normalizePresentation({theme:{paper:'constructor'}}).theme.paper, 'warm');
});
test('theme styles expose readable scoped variables for both modes', () => {
  const p = defaultPresentation();
  assert.equal(presentationStyle(p)['--paper-light'], '#f6f4ec');
  assert.equal(presentationStyle(p)['--accent-light'], '#3c6857');
  assert.notEqual(presentationStyle(p)['--accent-dark'], '#3c6857');
});
test('editing a draft leaves saved values unchanged', () => {
  const saved = defaultPresentation();
  const draft = updateDraft(saved, 'home.title.zh', '新标题');
  assert.equal(draft.home.title.zh, '新标题');
  assert.notEqual(saved.home.title.zh, '新标题');
});
test('resetting appearance preserves brand, navigation and footer', () => {
  const p = defaultPresentation();
  p.brand.name.zh = '保留'; p.theme.paper = 'neutral'; p.posts.layout = 'cards';
  const result = resetAppearance(p);
  assert.equal(result.brand.name.zh, '保留');
  assert.deepEqual(result.navigation, p.navigation);
  assert.deepEqual(result.theme, defaultPresentation().theme);
  assert.deepEqual(result.posts, defaultPresentation().posts);
  assert.equal(p.theme.paper, 'neutral');
});
test('explicit system preference wins over site default', () => {
  assert.equal(resolveThemeMode('system', 'dark'), 'system');
  assert.equal(resolveThemeMode(null, 'dark'), 'dark');
  assert.equal(resolveThemeMode('invalid', 'light'), 'light');
});
