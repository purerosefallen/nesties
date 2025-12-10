import type { Request } from 'express';
import { Awaitable } from './utility/awaitable';
import {
  createParamDecorator,
  Inject,
  Injectable,
  PipeTransform,
  Scope,
} from '@nestjs/common';
import { ModuleRef, REQUEST } from '@nestjs/core';
import {
  ApiHeader,
  ApiHeaderOptions,
  ApiQuery,
  ApiQueryOptions,
} from '@nestjs/swagger';
import { createProvider } from './create-provider';
import { MergeClassOrMethodDecorators } from './merge';
import { Type } from '@nestjs/common/interfaces';

const ParamResolverCopiedFieldsFromSwagger = [
  'required',
  'description',
  'example',
  'examples',
] as const;

export interface ParamResolverInputStatic
  extends Pick<
    ApiHeaderOptions | ApiQueryOptions,
    (typeof ParamResolverCopiedFieldsFromSwagger)[number]
  > {
  paramType: 'header' | 'query';
  paramName: string;
  openapiExtras?: ApiHeaderOptions | ApiQueryOptions;
}

export type AnyReq = Request & {
  headers?: Record<string, any>;
  query?: any;
  url?: string;
  originalUrl?: string;
  getHeader?: (name: string) => any;
  get?: (name: string) => any;
  header?: (name: string) => any;
};

export type ParamResolverInputDynamic<R = AnyReq> = (
  req: R,
  ref: ModuleRef,
) => Awaitable<string>;

export type ParamResolverInputDual =
  | ParamResolverInputStatic
  | ParamResolverInputDynamic;

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

@Injectable()
export class ParamResolverPipe implements PipeTransform {
  constructor(@Inject(ModuleRef) private moduleRef: ModuleRef) {}

  async transform(
    params: { req: AnyReq; resolver: ParamResolverBase<any> },
    metadata: any,
  ) {
    return params.resolver.resolve(params.req, this.moduleRef);
  }
}

const usedParamResolverTokens = new Set<string>();
export abstract class ParamResolverBase<T, R extends AnyReq = AnyReq> {
  // for override
  abstract toApiPropertyDecorator(
    extras?: ApiHeaderOptions | ApiQueryOptions,
  ): (
    extras2?: ApiHeaderOptions | ApiQueryOptions,
  ) => ClassDecorator & MethodDecorator;
  // for override
  abstract resolve(req: R, ref: ModuleRef): Awaitable<T>;

  toResolverFunction() {
    return async (req: R, ref: ModuleRef) => this.resolve(req, ref);
  }

  toParamDecorator() {
    const dec = createParamDecorator((_, ctx) => {
      const req = ctx.switchToHttp().getRequest<R>();
      return { req, resolver: this };
    });

    return (...pipes: (Type<PipeTransform> | PipeTransform)[]) =>
      dec(ParamResolverPipe, ...pipes);
  }

  // for override
  toString() {
    return 'ParamResolverBase';
  }

  toRequestScopedProvider() {
    const token = `PARAM_RESOLVER_${this.toString()}`;
    let useToken = token;
    if (usedParamResolverTokens.has(token)) {
      // avoid token conflict
      let suffix = 0;
      const tryToken = `${token}__${suffix}`;
      while (usedParamResolverTokens.has(tryToken)) {
        suffix++;
      }
      useToken = tryToken;
    }
    const provider = createProvider(
      {
        provide: useToken,
        inject: [REQUEST, ModuleRef],
        scope: Scope.REQUEST,
      },
      this.toResolverFunction(),
    );
    return {
      token: useToken,
      provider,
      inject: () => Inject(useToken),
    };
  }
}

export type TypeFromParamResolver<P> =
  P extends ParamResolverBase<infer T, any> ? T : never;

export class ParamResolver<R extends AnyReq = AnyReq> extends ParamResolverBase<
  string | undefined,
  R
> {
  private info: ParamResolverInputStatic;
  private dynamic: ParamResolverInputDynamic;
  constructor(input: ParamResolverInputDual) {
    super();
    if (typeof input === 'function') {
      this.dynamic = input;
    } else {
      this.info = { ...input };
      if (this.info.paramType === 'header') {
        this.info.paramName = this.info.paramName.toLowerCase();
      }
    }
  }

  override resolve(req: R, ref: ModuleRef): Awaitable<string | undefined> {
    if (this.info) {
      if (this.info.paramType === 'header') {
        const name = this.info.paramName;
        let raw = getHeader(req, name);
        if (name === 'accept-language')
          raw = pickPrimaryFromAcceptLanguage(raw);
        return raw;
      }
      if (this.info.paramType === 'query') {
        return getQueryValue(req, this.info.paramName);
      }
      throw new Error(`Unsupported paramType: ${this.info.paramType}`);
    } else if (this.dynamic) {
      return this.dynamic(req, ref);
    }
  }

  override toString() {
    const suffix = this.info
      ? `${this.info.paramType.toUpperCase()}_${this.info.paramName}`
      : `DYNAMIC`;
    return `ParamResolver_${suffix}`;
  }

  override toApiPropertyDecorator(
    extras: ApiHeaderOptions | ApiQueryOptions = {},
  ) {
    return (extras2: ApiHeaderOptions | ApiQueryOptions = {}) => {
      if (this.info) {
        const paramType = this.info.paramType;
        const apiOptions: ApiHeaderOptions = {
          name: this.info.paramName,
          ...ParamResolverCopiedFieldsFromSwagger.reduce((acc, field) => {
            if (field in this.info!) {
              (acc as any)[field] = this.info[field];
            }
            return acc;
          }, {} as ApiHeaderOptions),
          ...(this.info.openapiExtras || {}),
          ...extras,
          ...extras2,
        };
        return paramType === 'header'
          ? ApiHeader(apiOptions)
          : paramType === 'query'
            ? ApiQuery({ type: 'string', ...apiOptions })
            : () => {};
      }
      return () => {};
    };
  }
}

export class CombinedParamResolver<
  M extends Record<any, ParamResolverBase<any, AnyReq>>,
  R extends AnyReq = AnyReq,
> extends ParamResolverBase<
  {
    [K in keyof M]: TypeFromParamResolver<M[K]>;
  },
  R
> {
  constructor(private resolvers: M) {
    super();
  }

  override async resolve(
    req: R,
    ref: ModuleRef,
  ): Promise<{ [K in keyof M]: TypeFromParamResolver<M[K]> }> {
    const result = {} as {
      [K in keyof M]: TypeFromParamResolver<M[K]>;
    };
    // use Promise.all
    await Promise.all(
      Object.entries(this.resolvers).map(async ([key, resolver]) => {
        result[key as keyof M] = (await resolver.resolve(
          req,
          ref,
        )) as TypeFromParamResolver<M[typeof key]>;
      }),
    );
    return result;
  }

  override toString() {
    const suffix = Object.entries(this.resolvers)
      .map(([key, resolver]) => `${key.toString()}_${resolver.toString()}`)
      .join('__');
    return `CombinedParamResolver_${suffix}`;
  }

  override toApiPropertyDecorator(
    extras: ApiHeaderOptions | ApiQueryOptions = {},
  ) {
    const decs = Object.values(this.resolvers).map((resolver) =>
      resolver.toApiPropertyDecorator(extras),
    );
    return (extras2: ApiHeaderOptions | ApiQueryOptions) =>
      MergeClassOrMethodDecorators(
        decs.map((dec) =>
          dec({
            ...extras,
            ...extras2,
          }),
        ),
      );
  }
}

export type ParamResolverInput =
  | ParamResolverInputDual
  | ParamResolverBase<string>;

export const getParamResolver = (input: ParamResolverInput) => {
  if (input instanceof ParamResolverBase) {
    return input;
  }
  return new ParamResolver(input);
};

// @deprecated use ParamResolver directly
export const createResolver = (
  _options: ParamResolverInput,
): ParamResolverInputDynamic => {
  return getParamResolver(_options).toResolverFunction();
};

// @deprecated use ParamResolver directly
export const ApiFromResolver = (
  _options: ParamResolverInput,
  extras: ApiHeaderOptions | ApiQueryOptions = {},
): ClassDecorator & MethodDecorator => {
  return getParamResolver(_options).toApiPropertyDecorator(extras)();
};
