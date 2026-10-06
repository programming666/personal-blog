import type { CSSProperties } from 'react';

export type Localized = { zh: string; en: string };
export type ThemeMode = 'light' | 'dark' | 'system';
export type Presentation = {
  version: 1;
  brand: { name: Localized; description: Localized };
  home: { eyebrow: Localized; title: Localized; subtitle: Localized; authorName: string; authorBio: Localized; showAuthor: boolean };
  theme: { accent: string; paper: 'warm' | 'ivory' | 'neutral'; headingFont: 'serif' | 'sans'; mode: ThemeMode };
  posts: { layout: 'list' | 'cards'; showCover: boolean; pageSize: 6 | 9 | 12 | 18 };
  navigation: { id: 'home' | 'announcements' | 'friends'; label: Localized; visible: boolean }[];
  footer: { copyright: Localized; filing: string; filingUrl: string; socials: { label: string; url: string }[] };
};

export const paperColors = { warm: '#f6f4ec', ivory: '#faf7ef', neutral: '#f3f5f3' };
export const navigationPaths = { home: '/', announcements: '/announcements', friends: '/friends' };
const text = (zh: string, en: string): Localized => ({ zh, en });

export function defaultPresentation(): Presentation {
  return {
    version: 1,
    brand: { name: text('秦一宁', 'Qinyining'), description: text('关于技术、创造，以及值得记住的小事。', 'On technology, making things, and moments worth keeping.') },
    home: {
      eyebrow: text('保持好奇，慢慢生长', 'NOTES ON BUILDING & LIVING'),
      title: text('在代码之间，记录生活的回声。', 'Between code and everyday life.'),
      subtitle: text('把探索写成文字，让想法在这里生长。', 'A journal of experiments, ideas, and everyday discoveries.'),
      authorName: '秦一宁', authorBio: text('一个持续学习、记录与创造的人。', 'Always learning, writing, and building.'), showAuthor: true,
    },
    theme: { accent: '#3c6857', paper: 'warm', headingFont: 'serif', mode: 'system' },
    posts: { layout: 'list', showCover: true, pageSize: 9 },
    navigation: [
      { id: 'home', label: text('文章', 'Journal'), visible: true },
      { id: 'announcements', label: text('公告', 'Notes'), visible: true },
      { id: 'friends', label: text('友邻', 'Friends'), visible: true },
    ],
    footer: { copyright: text('© {year} {name}. 保持好奇，认真生活。', '© {year} {name}. Made with curiosity.'), filing: '', filingUrl: '', socials: [] },
  };
}

export function localized(value: Localized, lang = 'zh'): string {
  return lang === 'en' && value.en.trim() ? value.en : value.zh;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function safePublicUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

function mergeKnown<T>(fallback: T, input: unknown): T {
  if (typeof fallback === 'string') return (typeof input === 'string' ? input : fallback) as T;
  if (typeof fallback === 'boolean') return (typeof input === 'boolean' ? input : fallback) as T;
  if (typeof fallback === 'number') return (typeof input === 'number' && Number.isFinite(input) ? input : fallback) as T;
  if (!isRecord(fallback) || !isRecord(input)) return fallback;
  return Object.fromEntries(Object.entries(fallback).map(([key, value]) => [key, mergeKnown(value, input[key])])) as T;
}

export function normalizePresentation(value: unknown, legacyTitle?: string | null): Presentation {
  const defaults = defaultPresentation();
  if (legacyTitle) defaults.brand.name = text(legacyTitle, '');
  const result = mergeKnown(defaults, value);
  result.version = 1;
  const theme = result.theme;
  if (!/^#[\da-f]{6}$/i.test(theme.accent) || !isReadableAccent(theme.accent)) theme.accent = defaults.theme.accent;
  if (!Object.hasOwn(paperColors, theme.paper)) theme.paper = defaults.theme.paper;
  if (!['serif', 'sans'].includes(theme.headingFont)) theme.headingFont = defaults.theme.headingFont;
  if (!['light', 'dark', 'system'].includes(theme.mode)) theme.mode = defaults.theme.mode;
  if (!['list', 'cards'].includes(result.posts.layout)) result.posts.layout = defaults.posts.layout;
  if (![6, 9, 12, 18].includes(result.posts.pageSize)) result.posts.pageSize = defaults.posts.pageSize;
  if (isRecord(value) && Array.isArray(value.navigation)) {
    const entries = value.navigation;
    const seen = new Set<string>();
    result.navigation = entries.flatMap((item) => {
      if (!isRecord(item)) return [];
      const base = defaults.navigation.find((entry) => entry.id === item.id);
      if (!base || seen.has(base.id)) return [];
      seen.add(base.id);
      const merged = mergeKnown(base, item);
      if (merged.id === 'home') merged.visible = true;
      return [merged];
    });
    result.navigation.push(...defaults.navigation.filter((entry) => !seen.has(entry.id)));
  }
  if (isRecord(value) && isRecord(value.footer) && Array.isArray(value.footer.socials)) {
    result.footer.socials = value.footer.socials.filter((item): item is { label: string; url: string } =>
      isRecord(item) && typeof item.label === 'string' && safePublicUrl(item.url)
    ).slice(0, 8).map(({ label, url }) => ({ label, url }));
  }
  if (!safePublicUrl(result.footer.filingUrl)) result.footer.filingUrl = '';
  return result;
}

function luminance(hex: string) {
  const values = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

export function isReadableAccent(hex: string): boolean {
  if (!/^#[\da-f]{6}$/i.test(hex)) return false;
  const accent = luminance(hex);
  return Object.values(paperColors).every((paper) => (luminance(paper) + 0.05) / (accent + 0.05) >= 4.5);
}

function darkAccent(hex: string) {
  return '#' + [1, 3, 5].map((offset) => Math.round(parseInt(hex.slice(offset, offset + 2), 16) * 0.35 + 255 * 0.65).toString(16).padStart(2, '0')).join('');
}

export function presentationStyle(presentation: Presentation): CSSProperties & Record<string, string> {
  const theme = presentation.theme;
  const accent = isReadableAccent(theme.accent) ? theme.accent : '#3c6857';
  return {
    '--paper-light': paperColors[theme.paper] || paperColors.warm,
    '--accent-light': accent,
    '--accent-dark': darkAccent(accent),
    '--font-heading': theme.headingFont === 'sans' ? 'var(--font-sans)' : 'Georgia, "Noto Serif SC", "Songti SC", SimSun, serif',
  };
}

export function updateDraft(presentation: Presentation, path: string, value: unknown): Presentation {
  const copy = structuredClone(presentation);
  const keys = path.split('.');
  if (keys.some((key) => ['__proto__', 'constructor', 'prototype'].includes(key))) return copy;
  let current: Record<string, unknown> = copy as unknown as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) {
    if (!isRecord(current[key])) return copy;
    current = current[key];
  }
  const last = keys[keys.length - 1];
  if (Object.hasOwn(current, last)) current[last] = value;
  return copy;
}

export function resetAppearance(presentation: Presentation): Presentation {
  const defaults = defaultPresentation();
  return { ...structuredClone(presentation), theme: defaults.theme, posts: defaults.posts };
}

export function resolveThemeMode(stored: string | null, siteDefault: ThemeMode): ThemeMode {
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : siteDefault;
}
