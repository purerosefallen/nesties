import {
  ConsoleLogger,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { I18nModuleOptionsToken } from './i18n-token';
import { I18nModuleOptions } from './i18n-module.options';
import { I18nMiddleware } from './i18n-middleware.type';
import { parseI18n } from '../utility/parse-i18n';
import { ModuleRef } from '@nestjs/core';
import { createResolver } from '../resolver';

@Injectable()
export class I18nService {
  constructor(
    @Inject(I18nModuleOptionsToken) private options: I18nModuleOptions,
    @Inject(ModuleRef) private moduleRef: ModuleRef,
  ) {}

  private resolver = createResolver(this.options.resolver);

  private locales = new Set(this.options.locales);
  private defaultLocale = this.options.defaultLocale ?? this.options.locales[0];

  private middlewares: I18nMiddleware[] = [];

  middleware(mw: I18nMiddleware, prior = false) {
    if (prior) {
      this.middlewares.unshift(mw);
    } else {
      this.middlewares.push(mw);
    }
  }

  private logger = new ConsoleLogger('I18nService');

  private buildFallbackChain(locale: string): string[] {
    const best = this.getExactLocale(locale); // 你的“最长匹配”函数
    // 拆分 zh-Hans-CN -> ['zh-Hans-CN','zh-Hans','zh']
    const parts: string[] = [];
    const segs = best.split('-');
    for (let i = segs.length; i > 1; i--)
      parts.push(segs.slice(0, i).join('-'));
    parts.push(segs[0]); // 'zh'
    // 附加默认语言
    if (!parts.includes(this.defaultLocale)) parts.push(this.defaultLocale);
    // 去重
    return Array.from(new Set(parts)).filter((p) => this.locales.has(p));
  }

  private async applyMiddlewares(
    locale: string,
    text: string,
    ctx?: ExecutionContext,
  ): Promise<string | undefined> {
    const mws = this.middlewares;

    const tryLocale = async (loc: string) => {
      const dispatch = async (i: number): Promise<string | undefined> => {
        if (i >= mws.length) return undefined;

        const mw = mws[i];
        let nextCalled = false;

        const next = async (): Promise<string | undefined> => {
          nextCalled = true;
          return dispatch(i + 1);
        };

        try {
          const res = await mw(loc, text, next, ctx as any);
          if (res == null && !nextCalled) {
            return dispatch(i + 1);
          }
          return res;
        } catch (e) {
          if (e instanceof HttpException) {
            // this HttpException should throw up directly
            throw e;
          }
          this.logger.warn(`Middleware at index ${i} threw an error: ${e}`);
          return dispatch(i + 1);
        }
      };
      return dispatch(0);
    };

    for (const loc of this.buildFallbackChain(locale)) {
      const result = await tryLocale(loc);
      if (result != null) {
        return result;
      }
    }
    return undefined;
  }

  getExactLocale(locale: string) {
    const input = (locale ?? '').trim();
    if (!input) return this.defaultLocale;

    if (this.locales.has(input)) return input;

    // 小写化比较，保留原大小写
    const entries = Array.from(this.locales).map((l) => ({
      orig: l,
      lower: l.toLowerCase(),
    }));
    const lower = input.toLowerCase();

    // 1) 精确匹配（大小写不敏感）
    const exact = entries.find((e) => e.lower === lower);
    if (exact) return exact.orig;

    // 2) 按 '-' 拆分，依次尝试去掉最右边的段
    //    zh-Hans-CN → zh-Hans → zh
    const parts = lower.split('-');
    while (parts.length > 1) {
      parts.pop();
      const candidate = parts.join('-');
      const hit = entries.find((e) => e.lower === candidate);
      if (hit) return hit.orig;
    }

    // 3) 兜底
    return this.defaultLocale;
  }

  async getExactLocaleFromRequest(ctx: ExecutionContext) {
    const locale = await this.resolver(ctx, this.moduleRef);
    return this.getExactLocale(locale);
  }

  async translateString(
    locale: string,
    text: string,
    ctx?: ExecutionContext,
  ): Promise<string> {
    if (!text) return text;

    locale = this.getExactLocale(locale);

    const pieces = parseI18n(text);
    if (!pieces.some((p) => p.type === 'ph')) {
      return pieces
        .map((p) => (p.type === 'raw' ? p.value : `#{${p.rawInner}}`))
        .join('');
    }

    const promises: Array<Promise<string | undefined | null>> = [];

    for (const p of pieces) {
      if (p.type === 'ph') {
        promises.push(this.applyMiddlewares(locale, p.key, ctx));
      }
    }

    const results = await Promise.all(promises);

    let out = '';
    let k = 0;
    for (const p of pieces) {
      if (p.type === 'raw') {
        out += p.value;
      } else {
        const r = results[k++];
        out += r == null ? `#{${p.rawInner}}` : r;
      }
    }
    return out;
  }

  async translate<T>(
    locale: string,
    obj: T,
    ctx?: ExecutionContext,
  ): Promise<T> {
    const visited = new WeakSet<object>();

    const isBuiltInObject = (v: any): boolean => {
      if (v == null || typeof v !== 'object') return false;
      if (
        v instanceof Date ||
        v instanceof RegExp ||
        v instanceof Map ||
        v instanceof Set ||
        v instanceof WeakMap ||
        v instanceof WeakSet ||
        v instanceof ArrayBuffer ||
        v instanceof DataView ||
        ArrayBuffer.isView(v) // TypedArray / Buffer
      )
        return true;

      const tag = Object.prototype.toString.call(v);
      switch (tag) {
        case '[object URL]':
        case '[object URLSearchParams]':
        case '[object Error]':
        case '[object Blob]':
        case '[object File]':
        case '[object FormData]':
          return true;
        default:
          return false;
      }
    };

    const translateObjectPreservingProto = async (value: any): Promise<any> => {
      const proto = Object.getPrototypeOf(value);
      const out = Object.create(proto);

      const keys = Reflect.ownKeys(value);

      await Promise.all(
        keys.map(async (key) => {
          const desc = Object.getOwnPropertyDescriptor(value, key as any);
          if (!desc) return;

          // 数据属性：并发递归其 value，保持原属性特性
          if ('value' in desc) {
            const newVal = await visit(desc.value);
            Object.defineProperty(out, key, { ...desc, value: newVal });
            return;
          }

          // 访问器属性：先复制 getter/setter，再尝试读值→翻译→写回
          Object.defineProperty(out, key, desc);

          // 没有 getter 就无需处理；有 getter 但抛错也忽略
          let current: any = undefined;
          if (typeof desc.get === 'function') {
            try {
              current = desc.get.call(value);
            } catch {
              /* ignore */
            }
          }
          if (current === undefined) return;

          // 递归翻译 getter 返回的值；若有 setter 则写回
          try {
            const newVal = await visit(current);
            if (typeof desc.set === 'function') {
              try {
                desc.set.call(out, newVal);
              } catch {
                /* ignore */
              }
            }
          } catch {
            // 翻译失败不影响其他键
          }
        }),
      );

      return out;
    };

    const isTranslatable = (
      v: any,
    ): { ok: false } | { ok: true; kind: 'string' | 'object' } => {
      // 1) 所有 falsy 原样（null/undefined/false/0/''/NaN）
      if (!v) return { ok: false };

      // 2) 基本类型过滤
      const t = typeof v;
      if (
        t === 'number' ||
        t === 'bigint' ||
        t === 'symbol' ||
        t === 'function'
      ) {
        return { ok: false };
      }

      // 3) 可翻译：字符串 or 对象（对象再由后续逻辑决定是否深入）
      if (t === 'string') return { ok: true, kind: 'string' };
      if (t === 'object') {
        return { ok: true, kind: 'object' };
      }

      // 其它（boolean 等已包含在 falsy/基本类型里）
      return { ok: false };
    };

    const visit = async (value: any): Promise<any> => {
      // 1) 检查是否可翻译
      const check = isTranslatable(value);

      // 2) 不可翻译的原样返回
      if (!check.ok) {
        return value;
      }

      if (check.kind === 'string') {
        // 3) 字符串：翻译
        return this.translateString(locale, value, ctx);
      }

      // 4) Promise：不隐式展开（保持语义）
      if (value instanceof Promise) {
        return value.then((resolved) => visit(resolved));
      }

      // 5) 对象类：过滤内置对象
      if (typeof value === 'object') {
        if (!Array.isArray(value) && isBuiltInObject(value)) return value;

        // 防环
        if (visited.has(value)) return value;
        visited.add(value);

        // 数组：元素级递归
        if (Array.isArray(value)) {
          const out = await Promise.all(value.map((v) => visit(v)));
          return out as any;
        }

        // 其他对象（含类实例/DTO）：保留原型并递归自有属性
        return translateObjectPreservingProto(value);
      }

      // 其余类型（boolean 等）原样返回
      return value;
    };

    return visit(obj);
  }

  async translateRequest(ctx: ExecutionContext, obj: any): Promise<any> {
    const locale = await this.resolver(ctx, this.moduleRef);
    return this.translate(locale, obj, ctx);
  }
}
