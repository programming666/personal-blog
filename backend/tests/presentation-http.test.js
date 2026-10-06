const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const Setting = require('../models/Setting');
const User = require('../models/User');
const { defaultPresentation } = require('../services/presentation');
const { getPublicSettings } = require('../controllers/settings.controller');
const { getPresentationConfig, updatePresentationConfig } = require('../controllers/presentation.controller');
const presentationRouter = require('../routes/presentation.routes');

const response = () => ({
  code: 200,
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; }
});

const withServer = async (run) => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/presentation', presentationRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    return await run(`http://127.0.0.1:${server.address().port}/api/admin/presentation`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
};

test('public settings expose only media paths, compatible title and sanitized presentation', async t => {
  const value = defaultPresentation();
  value.brand.name.zh = '新的品牌';
  t.mock.method(Setting, 'find', async query => {
    assert.deepEqual(query, { key: { $in: ['site.logo', 'site.favicon', 'site.title', 'site.presentation'] } });
    return [
      { key: 'site.presentation', value },
      { key: 'site.title', value: '旧标题' },
      { key: 'site.logo', value: { path: 'uploads/logo.png', secret: 'should-not-leak' } },
      { key: 'site.favicon', value: { path: 'uploads/favicon.png' } },
      { key: 'auth.oauth.providers', value: [{ clientSecret: 'secret' }] },
      { key: 'ai.config', value: { apiKey: 'secret' } }
    ];
  });
  const res = response();
  await getPublicSettings({}, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { success: true, data: {
    'site.logo': { path: 'uploads/logo.png' },
    'site.favicon': { path: 'uploads/favicon.png' },
    'site.title': '新的品牌',
    'site.presentation': value
  } });
});

test('public settings supply defaults when no settings exist', async t => {
  t.mock.method(Setting, 'find', async () => []);
  const res = response();
  await getPublicSettings({}, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.data['site.presentation'], defaultPresentation());
});

test('public settings report database failure without leaking its message', async t => {
  t.mock.method(Setting, 'find', async () => { throw new Error('mongodb://user:password@host'); });
  const res = response();
  await getPublicSettings({}, res);
  assert.equal(res.code, 500);
  assert.equal(res.body.success, false);
  assert.doesNotMatch(JSON.stringify(res.body), /password/);
});

test('admin GET returns persisted normalized configuration', async t => {
  const value = defaultPresentation();
  value.home.title.zh = '我的首页';
  t.mock.method(Setting, 'find', async () => [{ key: 'site.presentation', value }]);
  const res = response();
  await getPresentationConfig({ user: { role: 'admin' } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { success: true, data: value });
});

test('admin PUT reports structured field errors and never writes invalid data', async t => {
  const update = t.mock.method(Setting, 'findOneAndUpdate', async () => assert.fail('must not write'));
  const value = defaultPresentation();
  value.theme.accent = '#ffffff';
  const res = response();
  await updatePresentationConfig({ user: { role: 'admin' }, body: value }, res);
  assert.equal(res.code, 400);
  assert.equal(res.body.success, false);
  assert.equal(typeof res.body.errors['theme.accent'], 'string');
  assert.equal(update.mock.calls.length, 0);
});

test('admin PUT persists valid settings and replies with saved data', async t => {
  const value = defaultPresentation();
  value.home.title.zh = '已修改';
  const update = t.mock.method(Setting, 'findOneAndUpdate', async () => ({ value }));
  const res = response();
  await updatePresentationConfig({ user: { role: 'admin' }, body: value }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { success: true, data: value });
  assert.equal(update.mock.calls.length, 1);
});

test('admin handlers do not expose persistence failures', async t => {
  t.mock.method(Setting, 'find', async () => { throw new Error('secret database error'); });
  t.mock.method(Setting, 'findOneAndUpdate', async () => { throw new Error('secret database error'); });
  for (const handler of [getPresentationConfig, updatePresentationConfig]) {
    const res = response();
    await handler({ user: { role: 'admin' }, body: defaultPresentation() }, res);
    assert.equal(res.code, 500);
    assert.doesNotMatch(JSON.stringify(res.body), /secret/);
  }
});

test('both admin handlers reject direct non-admin calls', async () => {
  for (const handler of [getPresentationConfig, updatePresentationConfig]) {
    for (const user of [undefined, { role: 'user' }]) {
      const res = response();
      await handler({ user, body: defaultPresentation() }, res);
      assert.equal(res.code, user ? 403 : 401);
    }
  }
});

test('GET and PUT routes reject anonymous requests using real auth middleware', async () => {
  await withServer(async url => {
    for (const method of ['GET', 'PUT']) {
      const res = await fetch(url, { method });
      assert.equal(res.status, 401);
    }
  });
});

test('GET and PUT routes reject regular users and suspended administrators', async t => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'presentation-test-only-secret';
  t.after(() => {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  });
  let user = { role: 'user', canLogin: true };
  t.mock.method(User, 'findById', async () => user);
  const token = jwt.sign({ id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET);
  await withServer(async url => {
    for (const identity of [{ role: 'user', canLogin: true }, { role: 'admin', canLogin: false }]) {
      user = identity;
      for (const method of ['GET', 'PUT']) {
        const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } });
        assert.equal(res.status, 403);
      }
    }
  });
});

test('authorized admin HTTP PUT round-trips through HTTP GET without a live database', async t => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'presentation-test-only-secret';
  t.after(() => {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  });
  t.mock.method(User, 'findById', async () => ({ role: 'admin', canLogin: true }));
  let stored;
  t.mock.method(Setting, 'findOneAndUpdate', async (query, update) => {
    assert.equal(query.key, 'site.presentation');
    stored = structuredClone(update.$set.value);
    return { value: stored };
  });
  t.mock.method(Setting, 'find', async () => stored ? [{ key: 'site.presentation', value: stored }] : []);
  const token = jwt.sign({ id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET);
  await withServer(async url => {
    const value = defaultPresentation();
    value.brand.name.zh = '持久化的新标题';
    value.posts.layout = 'cards';
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const saved = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(value) });
    assert.equal(saved.status, 200);
    assert.deepEqual((await saved.json()).data, value);
    const loaded = await fetch(url, { headers });
    assert.equal(loaded.status, 200);
    assert.deepEqual((await loaded.json()).data, value);
    value.footer.socials = [{ label: 'bad', url: 'javascript:alert(1)' }];
    const invalid = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(value) });
    assert.equal(invalid.status, 400);
    assert.deepEqual(stored.footer.socials, []);
  });
});
