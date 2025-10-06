// @ts-nocheck
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { settingsAPI } from '../services/api';

const SettingsContext = createContext({
  logoPath: null,
  refresh: () => {}
});

export const SettingsProvider = ({ children }) => {
  const [logoPath, setLogoPath] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await settingsAPI.getPublic();
      const data = res.data?.data || {};
      const logo = data['site.logo'];
      setLogoPath(logo?.path || null);
    } catch {
      setLogoPath(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ logoPath, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
