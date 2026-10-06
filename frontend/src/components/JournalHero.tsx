import type { Presentation } from '../utils/presentation';
import { getLang } from '../i18n';
import { localized } from '../utils/presentation';
import '../styles/journal.css';

const JournalHero = ({ presentation, lang = getLang() }: { presentation: Presentation; lang?: 'zh' | 'en' }) => {
  const { home } = presentation;
  return (
    <section className="journal-hero journal-shell">
      <div className="journal-hero-main">
        <p className="journal-eyebrow"><span className="journal-small-rule" />{localized(home.eyebrow, lang)}</p>
        <h1 className="journal-hero-title">{localized(home.title, lang)}</h1>
        <p className="journal-hero-subtitle">{localized(home.subtitle, lang)}</p>
        <div className="journal-hero-signoff" aria-hidden="true"><span />{lang === 'en' ? 'A personal journal' : '一份持续更新的个人手记'}</div>
      </div>
      {home.showAuthor && (home.authorName || localized(home.authorBio, lang)) && (
        <aside className="journal-author-note" aria-label={lang === 'en' ? 'About the author' : '关于作者'}>
          <div className="journal-botanical" aria-hidden="true">
            <svg viewBox="0 0 150 145" fill="none"><path d="M70 132C73 100 73 57 87 16M74 99C49 96 32 77 30 57C56 59 72 75 74 99ZM78 72C100 69 119 49 123 29C99 31 82 48 78 72ZM82 49C64 44 52 27 55 10C73 16 82 29 82 49Z" stroke="currentColor" strokeWidth="1.1" /><path d="M35 64L69 94M84 65L116 37M59 17L78 44" stroke="currentColor" strokeWidth=".65" /></svg>
          </div>
          <p className="journal-eyebrow">{lang === 'en' ? 'A NOTE FROM' : '关于这里'}</p>
          {home.authorName && <h2>{home.authorName}</h2>}
          <p className="journal-author-bio">{localized(home.authorBio, lang)}</p>
        </aside>
      )}
    </section>
  );
};

export default JournalHero;
