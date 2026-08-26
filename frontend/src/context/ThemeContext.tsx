import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  isDarkMode: boolean;
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const MODES: ThemeMode[] = ['system', 'light', 'dark'];

const readStoredMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return 'system'; // 默认跟随操作系统
};

const systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyMode = (mode: ThemeMode) => {
  const dark = mode === 'dark' || (mode === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);

  // 应用当前模式到 <html> 的 dark class
  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  // 「跟随系统」时实时响应系统明暗切换
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyMode('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem('theme', next);
  }, []);

  // 循环切换:system → light → dark → system
  const toggleTheme = useCallback(() => {
    const i = MODES.indexOf(mode);
    const next = MODES[(i + 1) % MODES.length];
    setMode(next);
  }, [mode, setMode]);

  const isDarkMode =
    mode === 'dark' || (mode === 'system' && systemPrefersDark());

  return (
    <ThemeContext.Provider value={{ isDarkMode, mode, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};