import {
  Controller,
  Get,
  INestApplication,
  Injectable,
  Module,
  Scope,
  Req,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { REQUEST, ModuleRef, ContextIdFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import type { Request } from 'express';
import {
  AnyReq,
  CombinedParamResolver,
  ParamResolver,
  ParamResolverPipe,
  TypeFromParamResolver,
} from '../src/resolver';

// ----------------- Request-scope service，用来验证 ModuleRef 动态解析 -----------------

@Injectable({ scope: Scope.REQUEST })
class RequestInfoService {
  constructor(@Inject(REQUEST) private readonly req: AnyReq) {}

  getHeader(name: string): string | undefined {
    const headers = this.req.headers ?? {};
    const key = name.toLowerCase();
    const val =
      headers[key] ??
      Object.entries(headers).find(([k]) => k.toLowerCase() === key)?.[1];
    if (val == null) return undefined;
    if (Array.isArray(val)) return String(val[0]);
    return String(val);
  }
}

// ----------------- 构造各种 ParamResolver -----------------

// 1. header 专用：X-Lang
const langHeaderResolver = new ParamResolver({
  paramType: 'header',
  paramName: 'X-Lang',
});
const LangHeader = langHeaderResolver.toParamDecorator();

// 2. query 专用：lang
const langQueryResolver = new ParamResolver({
  paramType: 'query',
  paramName: 'lang',
});
const LangQuery = langQueryResolver.toParamDecorator();

// 3. dynamic：使用 ModuleRef 拿 request-scope service
const dynamicFromServiceResolver = new ParamResolver(
  async (req: AnyReq, ref: ModuleRef) => {
    const svc = await ref.resolve(
      RequestInfoService,
      ContextIdFactory.getByRequest(req),
      { strict: false },
    );
    const v = svc.getHeader('X-Scoped');
    return v ? `scoped:${v}` : 'scoped:none';
  },
);
const DynamicFromService = dynamicFromServiceResolver.toParamDecorator();

// 4. CombinedParamResolver：把上面几个组合起来
const combinedResolver = new CombinedParamResolver({
  header: langHeaderResolver,
  query: langQueryResolver,
  dynamic: dynamicFromServiceResolver,
});

type CombinedResult = TypeFromParamResolver<typeof combinedResolver>;

const Combined = combinedResolver.toParamDecorator();

// 5. 再做两个 request-scope provider：
//    5.1 静态 ParamResolver（header）
const langHeaderScopedProviderMeta =
  langHeaderResolver.toRequestScopedProvider();
//    5.2 dynamic ParamResolver（会通过 ModuleRef 找 RequestInfoService）
const dynamicScopedProviderMeta =
  dynamicFromServiceResolver.toRequestScopedProvider();

// ----------------- 一个 service，用非 param decorator 的方式消费 resolver -----------------

@Injectable()
class ResolverConsumerService {
  constructor(private readonly moduleRef: ModuleRef) {}

  async viaResolve(req: AnyReq) {
    const lang = await langHeaderResolver.resolve(req, this.moduleRef);
    const query = await langQueryResolver.resolve(req, this.moduleRef);
    const dynamic = await dynamicFromServiceResolver.resolve(
      req,
      this.moduleRef,
    );
    return { lang, query, dynamic };
  }

  async viaResolverFunction(req: AnyReq) {
    const fn = combinedResolver.toResolverFunction();
    const combined = await fn(req, this.moduleRef);
    return combined;
  }
}

// ----------------- Controller：把所有使用姿势压在几个路由上 -----------------

@Controller()
class ParamResolverDemoController {
  constructor(
    private readonly consumer: ResolverConsumerService,
    // request-scope provider 注入（静态 header resolver）
    @langHeaderScopedProviderMeta.inject()
    private readonly scopedLang: string | undefined,
    // request-scope provider 注入（dynamic + ModuleRef）
    @dynamicScopedProviderMeta.inject()
    private readonly scopedDynamic: string | undefined,
  ) {}

  // 1. 单个 header resolver + param decorator
  @Get('/header-param')
  headerParam(@LangHeader() lang: string | undefined) {
    return { lang };
  }

  // 2. 单个 query resolver + param decorator
  @Get('/query-param')
  queryParam(@LangQuery() lang: string | undefined) {
    return { lang };
  }

  // 3. dynamic resolver + ModuleRef + param decorator
  @Get('/dynamic-param')
  dynamicParam(@DynamicFromService() v: string) {
    return { value: v };
  }

  // 4. CombinedParamResolver + param decorator
  @Get('/combined-param')
  combinedParam(@Combined() payload: CombinedResult) {
    return payload;
  }

  // 5. 不走 param decorator，直接在 service 里用 resolver.resolve(req, moduleRef)
  @Get('/service-consumer')
  async serviceConsumer(@Req() req: Request) {
    const result = await this.consumer.viaResolve(req as AnyReq);
    return result;
  }

  // 6. 不走 param decorator，用 toResolverFunction() + ModuleRef
  @Get('/resolver-function')
  async resolverFunction(@Req() req: Request) {
    const combined = await this.consumer.viaResolverFunction(req as AnyReq);
    return combined;
  }

  // 7. 使用 toRequestScopedProvider()（静态 header resolver）
  @Get('/scoped-header-provider')
  scopedHeaderProvider() {
    return { lang: this.scopedLang };
  }

  // 8. 使用 toRequestScopedProvider()（dynamic resolver + ModuleRef）
  @Get('/scoped-dynamic-provider')
  scopedDynamicProvider() {
    return { value: this.scopedDynamic };
  }
}

// ----------------- Module -----------------

@Module({
  controllers: [ParamResolverDemoController],
  providers: [
    ParamResolverPipe,
    RequestInfoService,
    ResolverConsumerService,
    langHeaderScopedProviderMeta.provider,
    dynamicScopedProviderMeta.provider,
  ],
})
class ParamResolverDemoModule {}

// ----------------- Tests -----------------

describe('ParamResolver / CombinedParamResolver e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ParamResolverDemoModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('resolves header param via ParamResolver (param decorator)', async () => {
    const res = await request(app.getHttpServer())
      .get('/header-param')
      .set('X-Lang', 'en-US')
      .expect(200);

    expect(res.body.lang).toBe('en-US');
  });

  it('returns undefined when header is missing', async () => {
    const res = await request(app.getHttpServer())
      .get('/header-param')
      .expect(200);

    expect(res.body.lang).toBeUndefined();
  });

  it('resolves query param via ParamResolver (param decorator)', async () => {
    const res = await request(app.getHttpServer())
      .get('/query-param?lang=zh-Hant')
      .expect(200);

    expect(res.body.lang).toBe('zh-Hant');
  });

  it('supports dynamic resolver using ModuleRef in param decorator', async () => {
    const res = await request(app.getHttpServer())
      .get('/dynamic-param')
      .set('X-Scoped', 'foo-bar')
      .expect(200);

    expect(res.body.value).toBe('scoped:foo-bar');
  });

  it('CombinedParamResolver merges multiple resolvers (header + query + dynamic)', async () => {
    const res = await request(app.getHttpServer())
      .get('/combined-param?lang=qq')
      .set('X-Lang', 'aa')
      .set('X-Scoped', 'bb')
      .expect(200);

    expect(res.body.header).toBe('aa');
    expect(res.body.query).toBe('qq');
    expect(res.body.dynamic).toBe('scoped:bb');
  });

  it('can use resolver.resolve(req, moduleRef) in a service (no param decorator)', async () => {
    const res = await request(app.getHttpServer())
      .get('/service-consumer?lang=svc-lang')
      .set('X-Lang', 'svc-header')
      .set('X-Scoped', 'svc-scoped')
      .expect(200);

    expect(res.body.lang).toBe('svc-header');
    expect(res.body.query).toBe('svc-lang');
    expect(res.body.dynamic).toBe('scoped:svc-scoped');
  });

  it('supports toResolverFunction() + ModuleRef on CombinedParamResolver', async () => {
    const res = await request(app.getHttpServer())
      .get('/resolver-function?lang=fn-lang')
      .set('X-Lang', 'fn-header')
      .set('X-Scoped', 'fn-scoped')
      .expect(200);

    expect(res.body.header).toBe('fn-header');
    expect(res.body.query).toBe('fn-lang');
    expect(res.body.dynamic).toBe('scoped:fn-scoped');
  });

  it('provides request-scoped value via toRequestScopedProvider() (static header resolver)', async () => {
    const res1 = await request(app.getHttpServer())
      .get('/scoped-header-provider')
      .set('X-Lang', 'lang-1')
      .expect(200);

    const res2 = await request(app.getHttpServer())
      .get('/scoped-header-provider')
      .set('X-Lang', 'lang-2')
      .expect(200);

    expect(res1.body.lang).toBe('lang-1');
    expect(res2.body.lang).toBe('lang-2');
  });

  it('provides request-scoped value via toRequestScopedProvider() (dynamic resolver + ModuleRef)', async () => {
    const res1 = await request(app.getHttpServer())
      .get('/scoped-dynamic-provider')
      .set('X-Scoped', 'd1')
      .expect(200);

    const res2 = await request(app.getHttpServer())
      .get('/scoped-dynamic-provider')
      .set('X-Scoped', 'd2')
      .expect(200);

    expect(res1.body.value).toBe('scoped:d1');
    expect(res2.body.value).toBe('scoped:d2');
  });
});
