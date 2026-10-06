import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useSettings } from './SettingsContext';
import { resolveThemeMode } from '../utils/presentation';
import type { ThemeMode } from '../utils/presentation';

interface ThemeContextType {
  isDarkMode: boolean;
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const MODES: ThemeMode[] = ['system', 'light', 'dark'];
function readStoredMode() {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem('theme'); } catch { return null; }
}
const systemPrefersDark = () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { presentation } = useSettings();
  const [storedMode, setStoredMode] = useState<string | null>(readStoredMode);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const mode = resolveThemeMode(storedMode, presentation.theme.mode);
  const isDarkMode = mode === 'dark' || (mode === 'system' && systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setSystemDark(mq.matches);
    mq.addEventListener('change', handler);
    const sync = (event: StorageEvent) => { if (event.key === 'theme') setStoredMode(event.newValue); };
    window.addEventListener('storage', sync);
    return () => { mq.removeEventListener('change', handler); window.removeEventListener('storage', sync); };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setStoredMode(next);
    try { localStorage.setItem('theme', next); } catch { /* 隐私模式下仍保留本次选择。 */ }
  }, []);
  const toggleTheme = useCallback(() => setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]), [mode, setMode]);
  return <ThemeContext.Provider value={{ isDarkMode, mode, toggleTheme, setMode }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
