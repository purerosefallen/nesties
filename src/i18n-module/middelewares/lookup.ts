import { I18nMiddleware } from '../i18n-middleware.type';
import { Awaitable } from '../../utility/awaitable';
import { ExecutionContext } from '@nestjs/common';

export type I18nDictionary = Record<string, Record<string, string>>;

type MatchType = 'exact' | 'hierarchy' | 'startsWith';

export const I18nLookupMiddleware = (
  dict:
    | I18nDictionary
    | ((
        locale: string,
        key: string,
        ctx?: ExecutionContext,
      ) => Awaitable<I18nDictionary>),
  options?: { matchType?: MatchType },
): I18nMiddleware => {
  const matchType: MatchType = options?.matchType ?? 'exact';
  const dictFactory = typeof dict === 'function' ? dict : () => dict;

  // 基于 locales 列表做“精确→层级回退(zh-Hans-CN→zh-Hans→zh)”的最长匹配
  const pickBestByHierarchy = (
    input: string,
    locales: string[],
  ): string | undefined => {
    if (!input) return undefined;
    const entries = locales.map((l) => ({ orig: l, lower: l.toLowerCase() }));
    const lower = input.toLowerCase();

    // 精确匹配（大小写不敏感）
    const exact = entries.find((e) => e.lower === lower);
    if (exact) return exact.orig;

    // 逐级回退：zh-Hans-CN -> zh-Hans -> zh
    const parts = lower.split('-');
    while (parts.length > 1) {
      parts.pop();
      const candidate = parts.join('-');
      const hit = entries.find((e) => e.lower === candidate);
      if (hit) return hit.orig;
    }
    return undefined;
  };

  return async (locale, key, next, ctx) => {
    const dictResolved = await dictFactory(locale, key, ctx);

    let dictionary = dictResolved[locale];

    if (!dictionary) {
      if (matchType === 'hierarchy') {
        const best = pickBestByHierarchy(locale, Object.keys(dictResolved));
        if (best) dictionary = dictResolved[best];
      } else if (matchType === 'startsWith') {
        const keys = Object.keys(dictResolved).filter((k) =>
          locale.startsWith(k),
        );
        if (keys.length) {
          const best = keys.reduce((a, b) => (b.length > a.length ? b : a));
          dictionary = dictResolved[best];
        }
      }
    }

    // 命中判断：允许空字符串 ''；仅 null/undefined 视为未命中
    if (dictionary && Object.prototype.hasOwnProperty.call(dictionary, key)) {
      const val = dictionary[key];
      if (val != null) {
        return val;
      }
    }

    return next();
  };
};
