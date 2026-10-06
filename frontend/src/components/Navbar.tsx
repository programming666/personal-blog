// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaMoon, FaSun, FaSignOutAlt, FaDesktop, FaBars, FaTimes, FaArrowRight } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { t, getLang, switchLang } from '../i18n';
import { localized, navigationPaths } from '../utils/presentation';
import '../styles/journal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const paths = navigationPaths;

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, mode, toggleTheme } = useTheme();
  const { logoPath, presentation } = useSettings();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);
  const lang = getLang();
  const brand = localized(presentation.brand.name, lang);
  const links = presentation.navigation.filter(item => item.visible && paths[item.id]);
  const logoUrl = logoPath ? `${API_BASE.replace(/\/$/, '')}/${logoPath.replace(/^\//, '')}` : null;

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const renderLinks = () => links.map(item => (
    <Link
      key={item.id}
      to={paths[item.id]}
      className={`journal-nav-link ${pathname === paths[item.id] ? 'is-active' : ''}`}
      aria-current={pathname === paths[item.id] ? 'page' : undefined}
      onClick={() => setMenuOpen(false)}
    >
      {localized(item.label, lang)}
    </Link>
  ));

  return (
    <header className="journal-header">
      <a className="journal-skip" href="#journal-content">{lang === 'en' ? 'Skip to content' : '跳到正文'}</a>
      <nav className="journal-shell journal-nav" aria-label={lang === 'en' ? 'Main navigation' : '主导航'}>
        <Link to="/" className="journal-brand" aria-label={brand}>
          {logoUrl ? <img src={logoUrl} alt="" width={38} height={38} className="journal-logo" /> : (
            <span className="journal-monogram" aria-hidden="true">{brand.slice(0, 1) || 'Q'}<span>.</span></span>
          )}
          <span className="journal-brand-name">{brand}</span>
        </Link>
        <div className="journal-desktop-links">{renderLinks()}</div>
        <div className="journal-nav-actions">
          <button className="journal-icon-button journal-language" type="button" onClick={() => switchLang(lang === 'zh' ? 'en' : 'zh')} aria-label={lang === 'zh' ? 'Switch to English' : '切换到中文'}>
            {lang === 'zh' ? 'EN' : '中'}
          </button>
          <button className="journal-icon-button" type="button" onClick={toggleTheme} aria-label={t('nav.theme')} title={`${t('nav.theme')} · ${mode}`}>
            {mode === 'system' ? <FaDesktop /> : isDarkMode ? <FaSun /> : <FaMoon />}
          </button>
          <span className="journal-nav-divider" aria-hidden="true" />
          {user ? (
            <>
              {user.role === 'admin' && <Link className="journal-session-link" to="/admin">{t('nav.admin')}</Link>}
              <button className="journal-icon-button" onClick={logout} type="button" aria-label={t('nav.logout')} title={t('nav.logout')}><FaSignOutAlt /></button>
            </>
          ) : (
            <Link to="/login" className="journal-session-link">{t('nav.login')} <FaArrowRight aria-hidden="true" /></Link>
          )}
          <button ref={menuButton} type="button" className="journal-icon-button journal-menu-toggle" aria-expanded={menuOpen} aria-controls="journal-mobile-menu" aria-label={lang === 'en' ? 'Toggle navigation' : '展开或收起导航'} onClick={() => setMenuOpen(open => !open)}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </nav>
      <nav id="journal-mobile-menu" className="journal-mobile-menu journal-shell" hidden={!menuOpen} aria-label={lang === 'en' ? 'Mobile navigation' : '移动端导航'}>{renderLinks()}</nav>
    </header>
  );
};

export default Navbar;
