// 内容翻译前端助手:译文已持久化到后端 Translation 集合(直接查库,不再用 localStorage 缓存)。
// - detectLang:判定文本语言(含中文 → zh,否则 en)
// - fetchTranslation:拉某条内容某字段的译文;原文已是目标语言不调 API;失败回退原文。
import { translateAPI } from './services/api';
import { getLang } from './i18n';

// 是否含中文字符(判定「文本已经是目标语言」的粗筛)
export const hasCJK = (s: string): boolean => /[\u4e00-\u9fff]/.test(s || '');

export const detectLang = (s: string): 'zh' | 'en' => (hasCJK(s) ? 'zh' : 'en');

/**
 * 拉取某条内容的译文(按内容 id + 字段 + 目标语言)。
 * @param sourceType 'post' | 'comment' | 'announcement'
 * @param sourceId 内容 ObjectId
 * @param field 'title' | 'body'
 * @param target 目标语言,缺省按当前站点语言
 * @returns 译文;原文已含目标语言或获取失败时返回 null(调用方回退原文)
 */
export async function fetchTranslation(
  sourceType: 'post' | 'comment' | 'announcement',
  sourceId: string,
  field: 'title' | 'body',
  target?: 'zh' | 'en'
): Promise<string | null> {
  const lang = (target ?? getLang()) as 'zh' | 'en';
  try {
    const res = await translateAPI.get(sourceType, sourceId, field, lang);
    return res?.data?.text ?? null;
  } catch {
    return null;
  }
}

/** 目标语言是否等于内容语言:是 → 不需要译文 */
export const needsTranslation = (text: string | undefined | null, target?: 'zh' | 'en'): boolean => {
  const lang = (target ?? getLang()) as 'zh' | 'en';
  return !!text && !!text.trim() && detectLang(text) !== lang;
};

/**
 * 取「展示用文本」:需要翻译则请求译文,已含目标语言或失败时回退原文。
 */
export async function displayText(
  sourceType: 'post' | 'comment' | 'announcement',
  sourceId: string,
  field: 'title' | 'body',
  original: string,
  target?: 'zh' | 'en'
): Promise<string> {
  if (!needsTranslation(original, target)) return original;
  const translation = await fetchTranslation(sourceType, sourceId, field, target);
  return translation ?? original;
}