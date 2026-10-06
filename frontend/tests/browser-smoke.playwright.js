async (page) => {
  const source = await (await page.request.get('http://127.0.0.1:5173/tests/browser-fixtures.json')).json();
  let saved = structuredClone(source.presentation);
  let writes = 0;
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.unroute('**/api/**');
  await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.turnstile = { render: function(){return "isolated-ui-test"}, remove: function(){}, reset: function(){} };' }));
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    let data = { success: true, data: [] };
    if (path === '/api/settings') data = { success: true, data: { 'site.presentation': saved, 'site.title': saved.brand.name.zh } };
    else if (path === '/api/admin/presentation') {
      if (request.method() === 'PUT') { saved = request.postDataJSON(); writes++; }
      data = { success: true, data: saved };
    } else if (path === '/api/auth/me') data = { success: true, data: source.admin };
    else if (path === '/api/admin/login') data = { success: true, user: source.admin, token: 'isolated-test-cookie' };
    else if (path === '/api/admin/stats') data = { success: true, data: { totalUsers: 3, totalPosts: 2, totalComments: 4 } };
    else if (path === '/api/posts' || path === '/api/admin/posts') data = { success: true, data: source.posts, pagination: { pages: 2, total: 4, page: 1 } };
    else if (/^\/api\/posts\/[^/]+$/.test(path)) data = { success: true, data: source.posts[0] };
    else if (path === '/api/auth/oauth/providers') data = { success: true, data: [{ id: 'github', name: 'GitHub', label: { zh: '使用 GitHub 登录', en: 'Continue with GitHub' }, buttonText: { zh: '使用 GitHub 登录', en: 'Continue with GitHub' }, startPath: '/api/auth/github', icon: { preset: 'github' } }] };
    else if (path.startsWith('/api/translate/')) data = { success: true, data: { text: null, needed: false } };
    else if (path === '/api/admin/users') data = { success: true, data: [source.admin] };
    else if (path.includes('announcements')) data = { success: true, data: [{ _id: 'notice-1', title: '站点更新', content: '新的阅读空间，欢迎来坐坐。', isPublished: true, pinned: true, createdAt: '2026-10-05T08:00:00Z' }] };
    else if (path.includes('friend-links')) data = { success: true, data: [{ _id: 'friend-1', name: '独立博客', description: '另一处安静的文字空间。', url: 'https://example.com', isPublished: true }] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data), headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5173', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers':'content-type,authorization', 'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'} });
  });
  await page.addInitScript(() => { localStorage.setItem('theme', 'light'); localStorage.setItem('lang', 'zh'); });
  await page.setViewportSize({width: 1440, height: 1000});
  await page.goto('http://127.0.0.1:5173/');
  await page.getByText('在代码之间，记录生活的回声。', {exact:true}).first().waitFor();
  const routes = ['/', '/posts/post-1', '/announcements', '/friends', '/login', '/privacy', '/terms'];
  const layout = [];
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({width, height: 1000});
    for (const path of routes) {
      await page.goto('http://127.0.0.1:5173' + path);
      await page.locator('main h1').first().waitFor();
      if (path === '/') await page.locator('.journal-post').first().waitFor();
      if (path.startsWith('/posts/')) await page.locator('.markdown-content pre code').first().waitFor();
      if (path === '/friends') await page.locator('.journal-friend-card').first().waitFor();
      if (path === '/announcements') await page.locator('.journal-notice').first().waitFor();
      if (path === '/login') await page.locator('.journal-provider-button').first().waitFor();
      const state = await page.evaluate(() => ({width:innerWidth, scroll:document.documentElement.scrollWidth, title:document.querySelector('h1')?.textContent}));
      layout.push({path,...state});
      if (state.scroll > width + 1) throw Error(`Horizontal overflow at ${path}, width ${width}: ${state.scroll}`);
    }
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:5173/');
  await page.screenshot({path:'.playwright-mcp/ui-home-desktop.png',fullPage:true});
  await page.evaluate(() => localStorage.setItem('adminUser', JSON.stringify({username:'admin',role:'admin'})));
  await page.goto('http://127.0.0.1:5173/admin?tab=settings');
  await page.getByRole('heading', {name:'你的站点，你的风格。'}).waitFor();
  const nameInput = page.locator('.appearance-editor').getByLabel(/^中文/).first();
  await nameInput.fill('测试编辑部');
  await page.getByRole('button', {name:'取消修改',exact:true}).click();
  if (await nameInput.inputValue() !== source.presentation.brand.name.zh) throw Error('Cancel did not restore saved value');
  if (writes !== 0) throw Error('Draft unexpectedly published');
  await nameInput.fill('测试编辑部');
  await page.getByRole('button', {name:'保存设置 ↗',exact:true}).click();
  await page.getByText('设置已保存，新的外观已生效。', {exact:true}).waitFor();
  if (writes !== 1 || saved.brand.name.zh !== '测试编辑部') throw Error('Settings not saved');
  await page.reload();
  await page.getByRole('heading', {name:'你的站点，你的风格。'}).waitFor();
  if (await page.locator('.appearance-editor').getByLabel(/^中文/).first().inputValue() !== '测试编辑部') throw Error('Settings not persisted');
  if (await page.title() !== '测试编辑部') throw Error('Document title did not follow saved brand');
  const desktopColumns = await page.locator('.appearance-preview .journal-hero').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  if (desktopColumns !== 2) throw Error('Desktop preview should keep its two-column layout');
  await page.getByRole('button', {name:'桌面',exact:true}).click();
  const mobileColumns = await page.locator('.appearance-preview .journal-hero').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  if (mobileColumns !== 1) throw Error('Mobile preview should use one column');
  await page.getByRole('button', {name:'手机',exact:true}).click();
  await page.locator('.appearance-preview-switches').getByRole('button', {name:'浅色',exact:true}).click();
  if (await page.locator('html').getAttribute('class') === 'dark') throw Error('Preview leaked dark mode to the site');
  await page.locator('.appearance-preview-switches').getByRole('button', {name:'深色',exact:true}).click();
  await page.screenshot({path:'.playwright-mcp/ui-appearance-desktop.png',fullPage:true});
  await page.getByRole('button', {name:'统计概览',exact:true}).click();
  await page.getByRole('heading', {name:'统计概览',exact:true}).waitFor();
  await page.getByRole('button', {name:'外观与内容',exact:true}).click();
  await page.locator('.appearance-editor').getByLabel(/^中文/).first().fill('保护未保存草稿');
  await page.getByText('● 有未保存修改', {exact:true}).waitFor();
  await page.evaluate(() => { window.__originalConfirm = window.confirm; window.__confirmCalls = 0; window.confirm = () => { window.__confirmCalls++; return false; }; history.back(); });
  await page.waitForFunction(() => window.__confirmCalls > 0 && location.search === '?tab=settings');
  if (await page.locator('.appearance-editor').getByLabel(/^中文/).first().inputValue() !== '保护未保存草稿') throw Error('Browser back lost the unsaved draft');
  await page.evaluate(() => {window.confirm = window.__originalConfirm;});
  await page.getByRole('button', {name:'取消修改',exact:true}).click();
  for (const width of [375,768,1440]) {
    await page.setViewportSize({width,height:1000});
    const state = await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    if (state.scroll > width + 1) throw Error(`Admin overflow at ${width}: ${state.scroll}`);
  }
  await page.setViewportSize({width:375,height:900});
  await page.screenshot({path:'.playwright-mcp/ui-appearance-mobile.png',fullPage:true});
  if (errors.length) throw Error(`Browser runtime errors: ${errors.join('; ')}`);
  return {layout,writes,errors};
}
