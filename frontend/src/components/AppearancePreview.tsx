import { useState } from 'react';
import JournalHero from './JournalHero';
import { localized, presentationStyle } from '../utils/presentation';
import type { Presentation } from '../utils/presentation';
import { useSettings } from '../context/SettingsContext';

export default function AppearancePreview({ presentation }: { presentation: Presentation }) {
  const [dark, setDark] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const { logoPath } = useSettings();
  const name = localized(presentation.brand.name, lang);
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const logo = logoPath ? `${base.replace(/\/$/, '')}/${logoPath.replace(/^\//, '')}` : null;
  return <aside className="appearance-preview-panel" aria-label="外观预览">
    <div className="appearance-preview-toolbar"><div><strong>实时预览</strong><span>仅你可见 · 演示内容</span></div><div className="appearance-preview-switches">
      <button type="button" aria-pressed={mobile} onClick={() => setMobile(!mobile)}>{mobile ? '手机' : '桌面'}</button>
      <button type="button" aria-pressed={dark} onClick={() => setDark(!dark)}>{dark ? '深色' : '浅色'}</button>
      <button type="button" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} aria-label="切换预览语言">{lang === 'zh' ? '中文' : 'EN'}</button>
    </div></div>
    <div className={`appearance-preview-viewport ${mobile ? 'is-mobile' : ''}`}>
      <div className={`appearance-preview ${dark ? 'dark' : 'light'}`} style={presentationStyle(presentation)}>
        <div className="preview-nav"><strong>{logo ? <img src={logo} alt="" /> : <span className="preview-monogram">{name.slice(0, 1)}.</span>}{name}</strong><span>{presentation.navigation.filter((item) => item.visible).map((item) => <span key={item.id}>{localized(item.label, lang)}</span>)}</span></div>
        <JournalHero presentation={presentation} lang={lang} />
        <div className="preview-stories"><div className="preview-section-title">{lang === 'zh' ? '最近的文字' : 'THE JOURNAL'}<span>01 — 02</span></div>
          <div className={`preview-story-grid ${presentation.posts.layout === 'cards' ? 'is-cards' : ''}`}>
            {['让个人网站回归内容本身', '一个周末，搭建自己的数字花园'].map((title, index) => <article className="preview-story" key={title}>
              {presentation.posts.showCover && <div className={`preview-cover cover-${index}`} aria-hidden="true"><span>{index === 0 ? 'Aa' : '↗'}</span></div>}
              <div><small>{lang === 'zh' ? '演示文章' : 'SAMPLE ARTICLE'} / 0{index + 1}</small><h3>{lang === 'zh' ? title : ['A place for thoughtful words', 'Building a digital garden'][index]}</h3><p>{lang === 'zh' ? '文字与想法，在这里慢慢生长。' : 'A small space for ideas to grow.'}</p></div>
            </article>)}
          </div>
        </div>
        <div className="preview-footer"><strong>{name}</strong><p>{localized(presentation.brand.description, lang)}</p><div>{presentation.footer.socials.map((item, index) => <span key={index}>{item.label} ↗</span>)}</div><small>{localized(presentation.footer.copyright, lang).replaceAll('{year}', String(new Date().getFullYear())).replaceAll('{name}', name)}</small>{presentation.footer.filing && <small>{presentation.footer.filing}</small>}</div>
      </div>
    </div>
    <p className="appearance-hint">预览展示草稿，不会发布演示文章。翻页数量等设置在保存后应用于真实内容。</p>
  </aside>;
}
