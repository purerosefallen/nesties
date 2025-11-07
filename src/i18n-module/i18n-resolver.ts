import {
  I18nResolverDynamic,
  I18nResolver,
  I18nResolverStatic,
} from './i18n-module.options';
import type { Request } from 'express';

type AnyReq = Request & {
  headers?: Record<string, any>;
  query?: any;
  url?: string;
  originalUrl?: string;
  getHeader?: (name: string) => any;
  get?: (name: string) => any;
  header?: (name: string) => any;
};

const coerceToString = (v: any): string | undefined => {
  if (v == null) return undefined; // null / undefined
  if (v === false) return undefined; // 👈 关键：把 false 当作未命中
  if (Array.isArray(v)) return v.length ? coerceToString(v[0]) : undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  // 其他类型（true / object / function / symbol / bigint）都不接受
  return undefined;
};

const getHeader = (req: AnyReq, name: string): string | undefined => {
  // 先走方法（express/部分适配器）
  const viaMethod =
    (typeof req.getHeader === 'function' && req.getHeader(name)) ||
    (typeof (req as any).header === 'function' && (req as any).header(name)) ||
    (typeof (req as any).get === 'function' && (req as any).get(name));

  if (viaMethod) {
    return coerceToString(viaMethod);
  }

  // 再查 headers，大小写无关
  const n = name.toLowerCase();
  const headers = req.headers ?? {};
  if (n in headers) return coerceToString((headers as any)[n]);

  const hit = Object.entries(headers).find(([k]) => k.toLowerCase() === n)?.[1];
  return coerceToString(hit);
};

const pickPrimaryFromAcceptLanguage = (v?: string): string | undefined => {
  if (!v) return undefined;
  const first = v.split(',')[0]?.trim();
  return first?.split(';')[0]?.trim() || first;
};

function getQueryValue(req: AnyReq, key: string): string | undefined {
  // 1. 普通对象模式（Express/Fastify 已解析）
  const q = req.query;
  if (q && typeof q === 'object' && !('raw' in q)) {
    const v = (q as any)[key];
    if (v != null) return coerceToString(v);
  }

  // 2. fallback：解析 URLSearchParams
  const rawUrl = req.originalUrl ?? req.url;
  if (typeof rawUrl === 'string' && rawUrl.includes('?')) {
    try {
      // 用 http://localhost 占位 base，避免相对路径错误
      const search = rawUrl.startsWith('http')
        ? new URL(rawUrl).search
        : new URL(rawUrl, 'http://localhost').search;

      if (search) {
        const params = new URLSearchParams(search);
        const val = params.get(key);
        if (val != null) return val;
      }
    } catch {
      // ignore malformed URL
    }
  }
  return undefined;
}

export const createDynamicResolverFromStatic = (
  _options: I18nResolver,
): I18nResolverDynamic => {
  if (typeof _options === 'function') {
    // it's already dynamic
    return _options;
  }
  const options = _options as I18nResolverStatic;
  const field = options.paramType; // 'header' | 'query'
  let name = options.paramName;
  if (field === 'header') name = name.toLowerCase();

  return (ctx) => {
    const req = ctx.switchToHttp().getRequest<AnyReq>();

    if (field === 'header') {
      let raw = getHeader(req, name);
      if (name === 'accept-language') raw = pickPrimaryFromAcceptLanguage(raw);
      return raw;
    }

    if (field === 'query') {
      return getQueryValue(req, name);
    }

    throw new Error(`Unsupported paramType: ${field}`);
  };
};
