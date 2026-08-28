// @ts-nocheck
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { settingsAPI } from '../services/api';

const SettingsContext = createContext({
  logoPath: null,
  faviconPath: null,
  siteTitle: null,
  refresh: () => {}
});

export const SettingsProvider = ({ children }) => {
  const [logoPath, setLogoPath] = useState(null);
  const [faviconPath, setFaviconPath] = useState(null);
  const [siteTitle, setSiteTitle] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await settingsAPI.getPublic();
      const data = res.data?.data || {};
      const logo = data['site.logo'];
      const favicon = data['site.favicon'];
      setLogoPath(logo?.path || null);
      setFaviconPath(favicon?.path || null);
      setSiteTitle(data['site.title'] || null);
    } catch {
      setLogoPath(null);
      setFaviconPath(null);
      setSiteTitle(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ logoPath, faviconPath, siteTitle, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
