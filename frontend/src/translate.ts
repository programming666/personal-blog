// 内容翻译前端助手:localStorage 缓存(键=目标语言+文本 hash),未命中才调后端 AI 翻译。
// 双向:zh 界面把非中文(如英文评论)译成简体中文;en 界面把中文译成英文。已是目标语言的内容原样返回。
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

// 是否含中文字符(判定「文本已经是目标语言」的粗筛)
const hasCJK = (s: string): boolean => /[\u4e00-\u9fff]/.test(s);

/**
 * 批量翻译文本。target 缺省时按当前站点语言。
 * 只翻译「还不是目标语言」的文本:zh 目标翻非中文;en 目标翻中文。
 */
export async function translateTexts(texts: string[], target?: 'zh' | 'en'): Promise<string[]> {
  const lang = (target ?? getLang()) as 'zh' | 'en';

  const results: string[] = new Array(texts.length);
  const missing: number[] = [];
  texts.forEach((text, i) => {
    const s = typeof text === 'string' ? text : '';
    // 已是目标语言:zh 目标下中文原样;en 目标下英文原样(不重复翻译、不浪费配额)
    if ((lang === 'zh' && hasCJK(s)) || (lang === 'en' && !hasCJK(s))) {
      results[i] = s;
      return;
    }
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