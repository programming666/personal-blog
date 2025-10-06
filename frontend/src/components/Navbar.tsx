// @ts-nocheck
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaSignInAlt, FaBullhorn, FaUserCircle, FaUsers, FaMoon, FaSun, FaSignOutAlt, FaBlog } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const navLinkClass = (active) =>
  `relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    active
      ? 'text-neutral-900 bg-neutral-100 dark:text-white dark:bg-neutral-900'
      : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900'
  }`;

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { logoPath } = useSettings();
  const { pathname } = useLocation();
  const isAdmin = user?.role === 'admin';

  const isActive = (path) => (path === '/' ? pathname === '/' : pathname.startsWith(path));
  const logoUrl = logoPath ? `${API_BASE}/${logoPath}` : null;

  return (
    <nav className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-black/70 border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-9 h-9 rounded-xl object-cover border border-neutral-200 dark:border-neutral-800"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-white grid place-items-center transition-transform group-hover:scale-105">
                <FaBlog className="text-sm text-white dark:text-neutral-900" />
              </div>
            )}
            <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
              Personal Blog
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link to="/" className={navLinkClass(isActive('/'))}>
              <FaHome /> 首页
            </Link>
            <Link to="/announcements" className={navLinkClass(isActive('/announcements'))}>
              <FaBullhorn /> 公告
            </Link>
            <Link to="/team" className={navLinkClass(isActive('/team'))}>
              <FaUsers /> 团队
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="切换主题"
              className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900 transition-colors"
            >
              {isDarkMode ? <FaSun /> : <FaMoon />}
            </button>

            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className={navLinkClass(isActive('/admin'))}>
                    <FaUserCircle /> 管理后台
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900 transition-colors"
                >
                  <FaSignOutAlt /> 退出
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
              >
                <FaSignInAlt /> 登录
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
