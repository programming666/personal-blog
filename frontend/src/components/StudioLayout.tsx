import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaBars, FaCheck, FaMoon, FaPlus, FaSignOutAlt, FaSun, FaTimes } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import '../styles/studio.css';

import { studioGroups } from '../utils/studioNavigation';

interface StudioLayoutProps {
  title: string;
  subtitle?: string;
  activeTab?: string;
  onSelectTab?: (id: string) => void;
  onLogout?: () => void;
  actions?: ReactNode;
  children: ReactNode;
}

export default function StudioLayout({ title, subtitle, activeTab = 'posts', onSelectTab, onLogout, actions, children }: StudioLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const { mode, toggleTheme } = useTheme();
  const themeLabel = mode === 'dark' ? '深色' : mode === 'light' ? '浅色' : '跟随系统';

  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, [menuOpen]);

  return (
    <div className="studio-shell">
      <a href="#studio-content" className="studio-skip-link">跳到工作区</a>
      <aside className="studio-sidebar">
        <div className="studio-sidebar-top">
          <Link to="/admin" className="studio-brand" aria-label="编辑工作室首页">
            <span className="studio-monogram" aria-hidden="true">Q.</span>
            <span><strong>编辑工作室</strong><small>THE EDITORIAL STUDIO</small></span>
          </Link>
          <button ref={menuButton} type="button" className="studio-icon-button studio-menu-toggle" aria-label={menuOpen ? '收起管理导航' : '展开管理导航'} aria-expanded={menuOpen} aria-controls="studio-navigation" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
        <nav id="studio-navigation" aria-label="后台管理" className={`studio-navigation ${menuOpen ? 'is-open' : ''}`}>
          {studioGroups.map(group => (
            <div className="studio-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(item => {
                const Icon = item.icon;
                const content = <><Icon aria-hidden="true" /><span>{item.name}</span>{activeTab === item.id && <span className="studio-active-dot" aria-hidden="true" />}</>;
                return onSelectTab ? (
                  <button key={item.id} type="button" data-studio-nav className="studio-nav-item" aria-current={activeTab === item.id ? 'page' : undefined} onClick={() => { onSelectTab(item.id); setMenuOpen(false); }}>{content}</button>
                ) : (
                  <Link key={item.id} className="studio-nav-item" to={`/admin?tab=${item.id}`} aria-current={activeTab === item.id ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{content}</Link>
                );
              })}
            </div>
          ))}
          <div className="studio-sidebar-bottom">
            <Link to="/" className="studio-nav-item"><FaArrowRight aria-hidden="true" /><span>浏览网站</span></Link>
            {onLogout && <button type="button" data-studio-nav data-studio-logout className="studio-nav-item" onClick={onLogout}><FaSignOutAlt aria-hidden="true" /><span>退出登录</span></button>}
          </div>
        </nav>
      </aside>
      <div className="studio-workspace">
        <header className="studio-topbar">
          <span className="studio-breadcrumb">工作室 <span>/</span> <strong>{title}</strong></span>
          <div className="studio-topbar-actions">
            <button type="button" className="studio-theme-button" onClick={toggleTheme} aria-label={`主题：${themeLabel}，点击切换`} title={`主题：${themeLabel}`}>
              {mode === 'dark' ? <FaMoon aria-hidden="true" /> : <FaSun aria-hidden="true" />}<span>{themeLabel}</span>
            </button>
            <span className="studio-session"><FaCheck aria-hidden="true" /> 管理工作区</span>
          </div>
        </header>
        <main id="studio-content" className="studio-content" tabIndex={-1}>
          <div className="studio-page-heading">
            <div><p className="studio-eyebrow">YOUR WORDS, YOUR SPACE</p><h1>{title}</h1>{subtitle && <p className="studio-page-description">{subtitle}</p>}</div>
            {actions && <div className="studio-page-actions">{actions}</div>}
          </div>
          {children}
          <footer className="studio-footer"><span>保持好奇，认真记录。</span><Link to="/">回到网站 <FaArrowRight aria-hidden="true" /></Link></footer>
        </main>
      </div>
    </div>
  );
}

export function StudioWriteAction() {
  return <Link to="/create" className="btn btn-primary"><FaPlus aria-hidden="true" /> 写文章</Link>;
}
