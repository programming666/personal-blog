import { Link } from 'react-router-dom';
import { FaArrowUp, FaExternalLinkAlt } from 'react-icons/fa';
import { useSettings } from '../context/SettingsContext';
import { getLang } from '../i18n';
import { localized, safePublicUrl } from '../utils/presentation';
import '../styles/journal.css';

const SiteFooter = () => {
  const { presentation } = useSettings();
  const lang = getLang();
  const { brand, footer } = presentation;
  const copyright = localized(footer.copyright, lang).replace(/\{year\}/g, () => String(new Date().getFullYear())).replace(/\{name\}/g, () => localized(brand.name, lang));
  return (
    <footer className="journal-footer">
      <div className="journal-shell">
        <div className="journal-footer-top">
          <div className="journal-footer-brand"><Link to="/">{localized(brand.name, lang)}<span aria-hidden="true">.</span></Link><p>{localized(brand.description, lang)}</p></div>
          <div className="journal-footer-links">
            {footer.socials.filter(item => safePublicUrl(item.url)).map((item, index) => (
              <a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noopener noreferrer">{item.label} <FaExternalLinkAlt aria-hidden="true" /></a>
            ))}
          </div>
          <button type="button" className="journal-back-top" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })} aria-label={lang === 'en' ? 'Back to top' : '返回顶部'}><FaArrowUp /></button>
        </div>
        <div className="journal-footer-bottom">
          <div className="journal-footer-copyright"><span>{copyright}</span>{footer.filing && (safePublicUrl(footer.filingUrl) ? <a href={footer.filingUrl} target="_blank" rel="noopener noreferrer">{footer.filing}</a> : <span>{footer.filing}</span>)}</div>
          <div className="journal-legal-links"><Link to="/terms">{lang === 'en' ? 'Terms' : '服务条款'}</Link><Link to="/privacy">{lang === 'en' ? 'Privacy' : '隐私政策'}</Link></div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
