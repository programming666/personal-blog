import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { settingsAPI } from '../services/api';
import { defaultPresentation, localized, normalizePresentation, presentationStyle } from '../utils/presentation';
import { getLang } from '../i18n';
import type { Presentation } from '../utils/presentation';

interface SettingsValue {
  logoPath: string | null;
  faviconPath: string | null;
  siteTitle: string | null;
  presentation: Presentation;
  loading: boolean;
  error: string;
  refresh: () => Promise<boolean>;
}
const SettingsContext = createContext<SettingsValue>({
  logoPath: null, faviconPath: null, siteTitle: null,
  presentation: defaultPresentation(), loading: true, error: '', refresh: async () => false,
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const [settings, setSettings] = useState({ logoPath: null as string | null, faviconPath: null as string | null, siteTitle: null as string | null, presentation: defaultPresentation() });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++request.current;
    try {
      const res = await settingsAPI.getPublic();
      if (id !== request.current) return false;
      const data = res.data?.data || {};
      setSettings({
        logoPath: data['site.logo']?.path || null,
        faviconPath: data['site.favicon']?.path || null,
        siteTitle: data['site.title'] || null,
        presentation: normalizePresentation(data['site.presentation'], data['site.title']),
      });
      setError('');
      return true;
    } catch {
      if (id === request.current) setError('站点设置暂时无法加载，正在使用已有设置。');
      return false;
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!pathname.startsWith('/posts/')) document.title = localized(settings.presentation.brand.name, getLang());
  }, [pathname, settings.presentation.brand.name]);
  useEffect(() => {
    const values = presentationStyle(settings.presentation);
    Object.entries(values).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    return () => { Object.keys(values).forEach((key) => document.documentElement.style.removeProperty(key)); };
  }, [settings.presentation]);

  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) return;
    const original = { href: icon.getAttribute('href') || '/favicon.svg', type: icon.type };
    if (settings.faviconPath) {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      icon.href = `${base.replace(/\/$/, '')}/${settings.faviconPath.replace(/^\//, '')}`;
      icon.type = 'image/png';
    }
    return () => { icon.setAttribute('href', original.href); icon.type = original.type; };
  }, [settings.faviconPath]);

  return <SettingsContext.Provider value={{ ...settings, loading, error, refresh }}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);
