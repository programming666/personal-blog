import { AppearanceText, AppearanceSelect, AppearanceToggle, LocalizedFields } from './AppearanceFields';
import { isReadableAccent } from '../utils/presentation';
import type { Presentation } from '../utils/presentation';


export default function AppearanceSections({ group, draft, update, setDraft, errors }: {
  group: string; draft: Presentation; update: (path: string, value: unknown) => void;
  setDraft: (value: Presentation) => void; errors: Record<string, string>;
}) {
  const fields = { update, errors };
  if (group === 'brand') return <>
    <LocalizedFields {...fields} label="站点名称" path="brand.name" value={draft.brand.name} maxLength={80} />
    <LocalizedFields {...fields} label="站点简介" path="brand.description" value={draft.brand.description} maxLength={300} multiline />
  </>;
  if (group === 'home') return <>
    <LocalizedFields {...fields} label="标题上方小字" path="home.eyebrow" value={draft.home.eyebrow} maxLength={80} />
    <LocalizedFields {...fields} label="首页主标题" path="home.title" value={draft.home.title} maxLength={120} multiline />
    <LocalizedFields {...fields} label="首页副标题" path="home.subtitle" value={draft.home.subtitle} maxLength={400} multiline />
    <AppearanceToggle label="显示作者介绍" checked={draft.home.showAuthor} onChange={(value) => update('home.showAuthor', value)} />
    <AppearanceText label="作者名称" value={draft.home.authorName} onChange={(value) => update('home.authorName', value)} maxLength={80} error={errors['home.authorName']} />
    <LocalizedFields {...fields} label="作者介绍" path="home.authorBio" value={draft.home.authorBio} maxLength={600} multiline />
  </>;
  if (group === 'theme') return <>
    <div className="appearance-field"><label htmlFor="appearance-accent">强调色</label><div className="appearance-color-control"><input id="appearance-accent" type="color" value={/^#[\da-f]{6}$/i.test(draft.theme.accent) ? draft.theme.accent : '#3c6857'} onChange={(event) => update('theme.accent', event.target.value)} /><input aria-label="强调色十六进制值" className="input-field" value={draft.theme.accent} maxLength={7} onChange={(event) => update('theme.accent', event.target.value)} /></div>
      <div className="appearance-swatches">{[['#3c6857', '松绿'], ['#425c79', '墨蓝'], ['#80513e', '赭石'], ['#655174', '灰紫'], ['#4e5940', '苔绿']].map(([color, name]) => <button type="button" key={color} title={name} aria-label={name} aria-pressed={draft.theme.accent === color} style={{ background: color }} onClick={() => update('theme.accent', color)} />)}</div>
      {!isReadableAccent(draft.theme.accent) && <p className="appearance-error">这个颜色对比度不足，预览暂用松绿。请选择更深的颜色，或使用上方预设。</p>}
      {errors['theme.accent'] && <p className="appearance-error">{errors['theme.accent']}</p>}
      <p className="appearance-hint">正文与按钮需保持清晰可读；深色模式会自动生成适配的浅墨色。</p>
    </div>
    <AppearanceSelect label="纸色背景" value={draft.theme.paper} onChange={(value) => update('theme.paper', value)} choices={[["warm", "暖纸 · 温润的米白"], ["ivory", "象牙 · 轻盈的暖白"], ["neutral", "中性 · 清爽的灰白"]]} />
    <AppearanceSelect label="标题字体" value={draft.theme.headingFont} onChange={(value) => update('theme.headingFont', value)} choices={[["serif", "衬线 · 刊物感"], ["sans", "无衬线 · 现代简洁"]]} />
    <AppearanceSelect label="默认主题" value={draft.theme.mode} onChange={(value) => update('theme.mode', value)} choices={[["system", "跟随访客系统"], ["light", "浅色"], ["dark", "深色"]]} />
    <p className="appearance-hint">访客手动选择的主题优先于站点默认值。预览右上角可单独切换深浅色。</p>
  </>;
  if (group === 'posts') return <>
    <AppearanceSelect label="文章布局" value={draft.posts.layout} onChange={(value) => update('posts.layout', value)} choices={[["list", "编辑式列表 · 文字优先"], ["cards", "图文卡片 · 封面优先"]]} />
    <AppearanceToggle label="显示文章封面" checked={draft.posts.showCover} onChange={(value) => update('posts.showCover', value)} />
    <AppearanceSelect label="每页文章数" value={String(draft.posts.pageSize)} onChange={(value) => update('posts.pageSize', Number(value))} choices={['6', '9', '12', '18'].map((value) => [value, `${value} 篇`])} />
  </>;
  if (group === 'navigation') return <>
    <p className="appearance-hint">调整公开页面的名称、顺序与显示。首页始终保留；隐藏入口不会禁用对应页面。</p>
    {draft.navigation.map((item, index) => <section className="appearance-nav-item" key={item.id}>
      <div className="appearance-nav-heading"><strong>{({home:'文章首页',announcements:'公告',friends:'友邻'})[item.id]}</strong><div>
        <button type="button" className="btn btn-secondary" aria-label={`上移${item.label.zh}`} disabled={index === 0} onClick={() => { const navigation = [...draft.navigation]; [navigation[index - 1], navigation[index]] = [navigation[index], navigation[index - 1]]; setDraft({...draft, navigation}); }}>↑</button>
        <button type="button" className="btn btn-secondary" aria-label={`下移${item.label.zh}`} disabled={index === draft.navigation.length - 1} onClick={() => { const navigation = [...draft.navigation]; [navigation[index + 1], navigation[index]] = [navigation[index], navigation[index + 1]]; setDraft({...draft, navigation}); }}>↓</button>
      </div></div>
      <AppearanceText label="中文名称" value={item.label.zh} maxLength={40} error={errors[`navigation.${index}.label.zh`]} onChange={(value) => setDraft({...draft,navigation:draft.navigation.map((entry,i) => i === index ? {...entry,label:{...entry.label,zh:value}} : entry)})} />
      <AppearanceText label="英文名称" value={item.label.en} maxLength={40} error={errors[`navigation.${index}.label.en`]} onChange={(value) => setDraft({...draft,navigation:draft.navigation.map((entry,i) => i === index ? {...entry,label:{...entry.label,en:value}} : entry)})} />
      <AppearanceToggle label={item.id === 'home' ? '首页入口始终显示' : '显示在导航中'} checked={item.visible} disabled={item.id === 'home'} onChange={(value) => setDraft({...draft,navigation:draft.navigation.map((entry,i) => i === index ? {...entry,visible:value} : entry)})} />
    </section>)}
  </>;
  if (group === 'footer') return <>
    <LocalizedFields {...fields} label="版权文案" path="footer.copyright" value={draft.footer.copyright} maxLength={200} />
    <p className="appearance-hint">{'使用 {year} 自动显示年份，{name} 自动显示站点名称。'}</p>
    <AppearanceText label="备案文字" value={draft.footer.filing} maxLength={120} onChange={(value) => update('footer.filing', value)} error={errors['footer.filing']} />
    <AppearanceText label="备案链接" value={draft.footer.filingUrl} maxLength={2048} onChange={(value) => update('footer.filingUrl', value)} error={errors['footer.filingUrl']} hint="可留空；填写时须使用 http:// 或 https:// 链接。" />
    <div className="appearance-nav-heading"><strong>社交链接</strong><span>{draft.footer.socials.length}/8</span></div>
    {draft.footer.socials.map((item, index) => <div className="appearance-nav-item" key={index}>
      <AppearanceText label={`链接 ${index + 1} · 名称`} value={item.label} maxLength={40} error={errors[`footer.socials.${index}.label`]} onChange={(value) => update('footer.socials', draft.footer.socials.map((entry,i) => i === index ? {...entry,label:value} : entry))} />
      <AppearanceText label="网址" value={item.url} maxLength={2048} error={errors[`footer.socials.${index}.url`]} onChange={(value) => update('footer.socials', draft.footer.socials.map((entry,i) => i === index ? {...entry,url:value} : entry))} />
      <button type="button" className="btn btn-danger" onClick={() => update('footer.socials', draft.footer.socials.filter((_,i) => i !== index))}>移除链接 {index + 1}</button>
    </div>)}
    <button type="button" className="btn btn-secondary" disabled={draft.footer.socials.length >= 8} onClick={() => update('footer.socials', [...draft.footer.socials,{label:'',url:''}])}>＋ 添加链接</button>
  </>;
  return null;
}
