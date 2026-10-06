const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultPresentation, validatePresentation, getPresentation, savePresentation } = require('../services/presentation');
const Setting = require('../models/Setting');

const invalid = (change, field) => {
  const value = defaultPresentation();
  change(value);
  assert.throws(() => validatePresentation(value), error => {
    assert.equal(error.statusCode, 400);
    assert.equal(typeof error.errors[field], 'string');
    return true;
  });
};

test('defaults are valid and independent objects', () => {
  const first = defaultPresentation();
  assert.deepEqual(validatePresentation(first), first);
  first.brand.name.zh = 'changed';
  first.navigation[0].visible = false;
  assert.notEqual(defaultPresentation().brand.name.zh, 'changed');
  assert.equal(defaultPresentation().navigation[0].visible, true);
});

test('validation returns a clean copy and trims ordinary text', () => {
  const value = defaultPresentation();
  value.brand.name.zh = '  我的博客  ';
  const clean = validatePresentation(value);
  assert.equal(clean.brand.name.zh, '我的博客');
  assert.equal(value.brand.name.zh, '  我的博客  ');
  assert.notEqual(clean, value);
});

test('English fields may be blank but the site name and main title may not', () => {
  const value = defaultPresentation();
  value.brand.name.en = '';
  assert.equal(validatePresentation(value).brand.name.en, '');
  invalid(p => { p.brand.name.zh = ' '; }, 'brand.name.zh');
  invalid(p => { p.home.title.zh = ''; }, 'home.title.zh');
});

for (const [name, change, field] of [
  ['unknown root field', p => { p.secret = 'no'; }, 'secret'],
  ['unknown nested field', p => { p.theme.css = 'body{}'; }, 'theme.css'],
  ['unknown localized field', p => { p.brand.name.fr = 'bonjour'; }, 'brand.name.fr'],
  ['missing section', p => { delete p.footer; }, 'footer'],
  ['unsupported version', p => { p.version = 2; }, 'version'],
  ['wrong boolean type', p => { p.posts.showCover = 'false'; }, 'posts.showCover'],
  ['invalid paper', p => { p.theme.paper = 'red'; }, 'theme.paper'],
  ['invalid font', p => { p.theme.headingFont = 'remote'; }, 'theme.headingFont'],
  ['invalid mode', p => { p.theme.mode = 'auto'; }, 'theme.mode'],
  ['invalid layout', p => { p.posts.layout = 'masonry'; }, 'posts.layout'],
  ['invalid page size', p => { p.posts.pageSize = 10000; }, 'posts.pageSize'],
  ['string page size', p => { p.posts.pageSize = '9'; }, 'posts.pageSize'],
  ['long site name', p => { p.brand.name.zh = 'a'.repeat(81); }, 'brand.name.zh'],
  ['long description', p => { p.brand.description.en = 'a'.repeat(301); }, 'brand.description.en'],
  ['long eyebrow', p => { p.home.eyebrow.zh = 'a'.repeat(81); }, 'home.eyebrow.zh'],
  ['long title', p => { p.home.title.en = 'a'.repeat(121); }, 'home.title.en'],
  ['long subtitle', p => { p.home.subtitle.zh = 'a'.repeat(401); }, 'home.subtitle.zh'],
  ['long author name', p => { p.home.authorName = 'a'.repeat(81); }, 'home.authorName'],
  ['long author biography', p => { p.home.authorBio.en = 'a'.repeat(601); }, 'home.authorBio.en'],
  ['long copyright', p => { p.footer.copyright.zh = 'a'.repeat(201); }, 'footer.copyright.zh'],
  ['CSS injection', p => { p.theme.accent = '#123456;display:none'; }, 'theme.accent'],
  ['short hex color', p => { p.theme.accent = '#abc'; }, 'theme.accent'],
  ['unreadable accent', p => { p.theme.accent = '#ffffff'; }, 'theme.accent'],
  ['script URL', p => { p.footer.socials = [{ label: 'test', url: 'javascript:alert(1)' }]; }, 'footer.socials.0.url'],
  ['data URL', p => { p.footer.socials = [{ label: 'test', url: 'data:text/html,hello' }]; }, 'footer.socials.0.url'],
  ['protocol-relative URL', p => { p.footer.filingUrl = '//example.com'; }, 'footer.filingUrl'],
  ['URL with credentials', p => { p.footer.filingUrl = 'https://admin:password@example.com'; }, 'footer.filingUrl'],
  ['URL control characters', p => { p.footer.filingUrl = 'https://exa\nmple.com'; }, 'footer.filingUrl'],
  ['long URL', p => { p.footer.filingUrl = 'https://example.com/' + 'a'.repeat(2048); }, 'footer.filingUrl'],
  ['too many social links', p => { p.footer.socials = Array.from({ length: 9 }, () => ({ label: 'test', url: 'https://example.com' })); }, 'footer.socials'],
  ['blank social label', p => { p.footer.socials = [{ label: '', url: 'https://example.com' }]; }, 'footer.socials.0.label'],
  ['long social label', p => { p.footer.socials = [{ label: 'a'.repeat(41), url: 'https://example.com' }]; }, 'footer.socials.0.label'],
  ['unknown social property', p => { p.footer.socials = [{ label: 'test', url: 'https://example.com', html: 'no' }]; }, 'footer.socials.0.html'],
  ['duplicate navigation', p => { p.navigation[1].id = 'home'; }, 'navigation'],
  ['unknown navigation', p => { p.navigation[1].id = 'admin'; }, 'navigation.1.id'],
  ['missing navigation', p => { p.navigation.pop(); }, 'navigation'],
  ['hidden homepage', p => { p.navigation[0].visible = false; }, 'navigation.0.visible']
]) {
  test(`rejects ${name}`, () => invalid(change, field));
}

test('rejects null, arrays and non-plain objects', () => {
  for (const value of [null, [], 'text', 4, new Date()]) {
    assert.throws(() => validatePresentation(value), { statusCode: 400 });
  }
});

test('rejects own prototype-like keys instead of copying them', () => {
  const value = defaultPresentation();
  value.theme = JSON.parse('{"accent":"#3c6857","paper":"warm","headingFont":"serif","mode":"system","__proto__":{"polluted":true}}');
  assert.throws(() => validatePresentation(value), error => error.statusCode === 400 && !!error.errors['theme.__proto__']);
  assert.equal({}.polluted, undefined);
});

test('supports permitted layout, colors, URLs and custom navigation ordering', () => {
  const value = defaultPresentation();
  value.theme.accent = '#124D3A';
  value.posts = { layout: 'cards', pageSize: 18, showCover: false };
  value.navigation.reverse();
  value.navigation.find(item => item.id === 'friends').visible = false;
  value.footer.filingUrl = 'https://beian.miit.gov.cn/';
  value.footer.socials = [{ label: 'Blog', url: 'http://localhost:5173/' }];
  const clean = validatePresentation(value);
  assert.equal(clean.theme.accent, '#124d3a');
  assert.equal(clean.navigation[0].id, 'friends');
  assert.equal(clean.footer.socials[0].url, 'http://localhost:5173/');
});

test('missing configuration inherits the legacy site title without writing', async t => {
  const find = t.mock.method(Setting, 'find', async query => {
    assert.deepEqual(query, { key: { $in: ['site.presentation', 'site.title'] } });
    return [{ key: 'site.title', value: '旧站点' }];
  });
  const save = t.mock.method(Setting, 'findOneAndUpdate', async () => assert.fail('read must not write'));
  const value = await getPresentation();
  assert.equal(value.brand.name.zh, '旧站点');
  assert.equal(value.brand.name.en, '');
  assert.equal(find.mock.calls.length, 1);
  assert.equal(save.mock.calls.length, 0);
});

test('stored configuration round-trips and takes priority over legacy title', async t => {
  const value = defaultPresentation();
  value.brand.name.zh = '新站点';
  t.mock.method(Setting, 'find', async () => [
    { key: 'site.title', value: '旧站点' },
    { key: 'site.presentation', value }
  ]);
  assert.deepEqual(await getPresentation(), value);
});

test('invalid stored data falls back safely and never echoes unknown fields', async t => {
  t.mock.method(Setting, 'find', async () => [
    { key: 'site.presentation', value: { secret: 'not-public', theme: { accent: 'red;' } } },
    { key: 'site.title', value: '旧站点' }
  ]);
  const value = await getPresentation();
  assert.equal(value.brand.name.zh, '旧站点');
  assert.equal(value.secret, undefined);
  assert.equal(value.theme.accent, '#3c6857');
});

test('save validates first and atomically replaces only presentation settings', async t => {
  const calls = [];
  t.mock.method(Setting, 'findOneAndUpdate', async (...args) => {
    calls.push(args);
    return { value: args[1].$set.value };
  });
  const value = defaultPresentation();
  value.brand.name.zh = 'changed';
  assert.deepEqual(await savePresentation(value), value);
  assert.deepEqual(calls, [[
    { key: 'site.presentation' },
    { $set: { value }, $setOnInsert: { key: 'site.presentation' } },
    { new: true, upsert: true, runValidators: true }
  ]]);
  await assert.rejects(savePresentation({}), { statusCode: 400 });
  assert.equal(calls.length, 1);
});

test('database failures propagate for controllers to report', async t => {
  t.mock.method(Setting, 'find', async () => { throw new Error('offline'); });
  await assert.rejects(getPresentation(), /offline/);
  t.mock.method(Setting, 'findOneAndUpdate', async () => { throw new Error('offline'); });
  await assert.rejects(savePresentation(defaultPresentation()), /offline/);
});
