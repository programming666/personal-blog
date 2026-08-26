// 内容翻译前端助手:localStorage 缓存(键=目标语言+文本 hash),未命中才调后端 AI 翻译。
// 站点原文以中文为基准:lang==='zh' 直接返回数据库原文;lang==='en' 才发起翻译。
// 失败时回退原文(渐进增强,翻译不是硬依赖)。
import { translateAPI } from './services/api';
import { getLang } from './i18n';

const CACHE_PREFIX = 'tr:';
const MAX_ENTRIES = 400;

// djb2 风格短 hash,足以区分缓存键
const hash = (s: string): string => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
};

const cacheKey = (target: string, text: string) => `${CACHE_PREFIX}${target}:${hash(text)}`;

const trimCache = () => {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    if (keys.length > MAX_ENTRIES) {
      // 简单清掉最旧的一半(不精确 LRU,个人站足够)
      const toRemove = keys.sort().slice(0, Math.floor(keys.length / 2));
      toRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    /* ignore */
  }
};

/**
 * 批量翻译文本。target 缺省时按当前站点语言;'zh' 直接返回原文。
 */
export async function translateTexts(texts: string[], target?: 'zh' | 'en'): Promise<string[]> {
  const lang = (target ?? getLang()) as 'zh' | 'en';
  if (lang === 'zh') return texts;

  const results: string[] = new Array(texts.length);
  const missing: number[] = [];
  texts.forEach((text, i) => {
    const s = typeof text === 'string' ? text : '';
    try {
      const cached = localStorage.getItem(cacheKey(lang, s));
      if (cached !== null) {
        results[i] = cached;
        return;
      }
    } catch {
      /* ignore */
    }
    missing.push(i);
  });

  if (missing.length > 0) {
    try {
      const resp = await translateAPI.batch(
        missing.map((i) => texts[i]),
        lang
      );
      const translations: string[] = resp.data?.translations ?? [];
      translations.forEach((tr, j) => {
        const idx = missing[j];
        results[idx] = tr;
        if (tr && tr !== texts[idx]) {
          try {
            localStorage.setItem(cacheKey(lang, texts[idx]), tr);
            trimCache();
          } catch {
            /* ignore */
          }
        }
      });
    } catch {
      /* 网络/后端失败 → 保持原文 */
    }
  }

  return texts.map((_, i) => (results[i] === undefined ? texts[i] : results[i]));
}