// api-inject.swagger.spec.ts
import 'reflect-metadata';

import { Controller, Get, Injectable } from '@nestjs/common';
import { DECORATORS } from '@nestjs/swagger/dist/constants';

import { ApiInject } from '../src/api-inject';
import { ResolverSwaggerMap } from '../src/utility/resolver-swagger-map';
import { InjectionTokenMap } from '../src/utility/injection-token-map';
import { createProvider } from '../src/create-provider';
import { AnyReq, CombinedParamResolver, ParamResolver } from '../src/resolver';
type HookFn = () => void;

/**
 * 继承 ParamResolver，覆写 toSwaggerInfo：
 * - 不改 swagger 行为（仍走 super）
 * - 在 decorator 被 apply 时触发 hook（证明“确实打上去了”）
 */
class HookedParamResolver<R extends AnyReq> extends ParamResolver<R> {
  constructor(
    input: any,
    private readonly hook: HookFn,
  ) {
    super(input);
  }
  override toSwaggerInfo() {
    const infos = super.toSwaggerInfo();
    return infos.map((info) => ({
      ...info,
      swagger: (extras: any = {}) => {
        const dec = info.swagger(extras);
        return (...args: any[]) => {
          this.hook();
          return (dec as any)(...args);
        };
      },
    }));
  }
}

const getApiHeadersMeta = (cls: any): any[] =>
  Reflect.getMetadata(DECORATORS.API_HEADERS, cls) ?? [];

const getApiParamsMetaOfHandler = (handler: Function): any[] =>
  Reflect.getMetadata(DECORATORS.API_PARAMETERS, handler) ?? [];

describe('ApiInject -> swagger metadata', () => {
  beforeEach(() => {
    ResolverSwaggerMap.clear();
    InjectionTokenMap.clear();
  });

  test('ParamResolver(header): class 上应有 API_HEADERS metadata；hook 应触发', () => {
    let hits = 0;

    const r = new HookedParamResolver(
      { paramType: 'header', paramName: 'x-user-token', required: true },
      () => hits++,
    );
    const pr = r.toRequestScopedProvider();

    @Controller()
    class C1 {
      @Get('/ping')
      ping() {
        return 'ok';
      }

      // 入口用 resolver provider token（string）
      constructor(@ApiInject(pr.token) _x: any) {}
    }

    expect(hits).toBe(1);

    const headers = getApiHeadersMeta(C1);
    expect(headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'x-user-token' }),
      ]),
    );
  });

  test('ParamResolver(query): 应把 API_PARAMETERS metadata 写到路由方法上（不是 class 上）；hook 应触发', () => {
    let hits = 0;

    const r = new HookedParamResolver(
      { paramType: 'query', paramName: 'lang', required: false },
      () => hits++,
    );
    const pr = r.toRequestScopedProvider();

    @Controller()
    class C2 {
      @Get('/list')
      list() {
        return [];
      }

      constructor(@ApiInject(pr.token) _x: any) {}
    }

    expect(hits).toBe(1);

    // ✅ query params 是写在 handler function 上
    const handler = C2.prototype.list;
    const params = getApiParamsMetaOfHandler(handler);

    expect(params).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ in: 'query', name: 'lang' }),
      ]),
    );
  });

  test('CombinedParamResolver: 同时包含 header+query，应分别写到 class(API_HEADERS) + handler(API_PARAMETERS)', () => {
    let hits = 0;

    const header = new HookedParamResolver(
      { paramType: 'header', paramName: 'x-user-token', required: true },
      () => hits++,
    );
    const query = new HookedParamResolver(
      { paramType: 'query', paramName: 'page', required: false },
      () => hits++,
    );

    const combined = new CombinedParamResolver({ header, query });
    const pr = combined.toRequestScopedProvider();

    @Controller()
    class C3 {
      @Get('/items')
      items() {
        return [];
      }

      constructor(@ApiInject(pr.token) _x: any) {}
    }

    // hook 两个 resolver 都应被 apply
    expect(hits).toBe(2);

    const headers = getApiHeadersMeta(C3);
    expect(headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'x-user-token' }),
      ]),
    );

    const params = getApiParamsMetaOfHandler(C3.prototype.items);
    expect(params).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ in: 'query', name: 'page' }),
      ]),
    );
  });

  test('createProvider 链路：string token -> inject([resolverToken]) -> 应能推导并写 swagger', () => {
    let hits = 0;

    const r = new HookedParamResolver(
      { paramType: 'header', paramName: 'x-user-token', required: true },
      () => hits++,
    );
    const pr = r.toRequestScopedProvider();

    createProvider(
      { provide: 'SVC', inject: [pr.token] as const },
      async (_t) => ({ ok: true }),
    );

    @Controller()
    class C4 {
      @Get('/svc')
      svc() {
        return 'ok';
      }

      constructor(@ApiInject('SVC') _svc: any) {}
    }

    expect(hits).toBe(1);

    const headers = getApiHeadersMeta(C4);
    expect(headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'x-user-token' }),
      ]),
    );
  });

  test('真实 class 链路：Controller 注入 ArticleService(class)，ArticleService ctor 依赖 AuthService(token via createProvider -> resolver token) 也应能推导', () => {
    let hits = 0;

    const r = new HookedParamResolver(
      { paramType: 'header', paramName: 'x-user-token', required: true },
      () => hits++,
    );
    const pr = r.toRequestScopedProvider();

    @Injectable()
    class AuthService {}

    // AuthService 通过 createProvider：provide(AuthService) -> inject([resolverToken])
    createProvider(
      { provide: AuthService, inject: [pr.token] as const },
      async () => new AuthService(),
    );

    @Injectable()
    class ArticleService {
      constructor(public readonly auth: AuthService) {}
    }

    @Controller()
    class C5 {
      @Get('/article')
      article() {
        return 'ok';
      }

      // ✅ ApiInject() 不传 token，走 reflect 推断 ArticleService(class)
      constructor(@ApiInject() _svc: ArticleService) {}
    }

    expect(hits).toBe(1);

    const headers = getApiHeadersMeta(C5);
    expect(headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'x-user-token' }),
      ]),
    );
  });
});
