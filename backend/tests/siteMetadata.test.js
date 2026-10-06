const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultPresentation } = require('../services/presentation');
const { siteMetadata } = require('../services/siteMetadata');

test('server metadata follows presentation branding and object media paths', async () => {
  const value = defaultPresentation();
  value.brand.name.zh = '新的刊物'; value.brand.description.zh = '新的简介';
  const meta = await siteMetadata([
    {key:'site.presentation',value}, {key:'site.title',value:'旧标题'},
    {key:'site.favicon',value:{path:'uploads/icon.png'}},
    {key:'site.logo',value:{path:'uploads/logo.png'}},
  ]);
  assert.deepEqual(meta, {title:'新的刊物',description:'新的简介',favicon:'uploads/icon.png',logo:'uploads/logo.png'});
});
test('legacy settings remain usable without a presentation document', async () => {
  const meta = await siteMetadata([{key:'site.title',value:'旧标题'},{key:'site.description',value:'旧简介'},{key:'site.logo',value:'uploads/old.png'}]);
  assert.equal(meta.title,'旧标题'); assert.equal(meta.description,'旧简介'); assert.equal(meta.logo,'uploads/old.png');
});
test('malformed media objects do not become object Object URLs', async () => {
  const meta = await siteMetadata([{key:'site.favicon',value:{secret:'not-a-path'}}]);
  assert.equal(meta.favicon,null);
});
