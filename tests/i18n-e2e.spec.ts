import { INestApplication, Controller, Get, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  BlankReturnMessageDto,
  GenericReturnMessageDto,
} from '../src/return-message';
import {
  createI18n,
  I18nLookupMiddleware,
  I18nService,
  PutLocale,
} from '../src/i18n-module';
import { LocaleContext } from '../src/i18n-module/locale.context';
import { ApiInject } from '../src/resolver';
import { DECORATORS } from '@nestjs/swagger/dist/constants';

// ---- dictionary for tests (covering en / zh / zh-Hans)
const DICT: Record<string, Record<string, string>> = {
  en: {
    ok: 'success',
    hello: 'hello',
    'blue sky with {{ ocean }}': 'blue sky with ocean',
    '{"a":1,"b":{"c":2}}': 'json object',
    bad: 'bad request',
    empty: '',
    thingOnlyInEn: 'This key is only in en locale',
  },
  'zh-Hans': {
    ok: '成功',
    hello: '你好',
    'blue sky with {{ ocean }}': '蓝天和大海',
    '{"a":1,"b":{"c":2}}': 'JSON 对象',
    bad: '错误请求',
    empty: '',
  },
  zh: {
    ok: '成功(zh)',
    thingOnlyInZh: '此键仅在 zh 语言中存在',
  },
};

const { I18nModule, UseI18n } = createI18n({
  resolver: {
    paramType: 'header',
    paramName: 'X-Lang',
  },
  locales: ['en', 'zh', 'zh-Hans'],
  defaultLocale: 'en',
});

const getApiHeadersMeta = (cls: any): any[] =>
  Reflect.getMetadata(DECORATORS.API_HEADERS, cls) ?? [];

// ---- a tiny controller using your DTOs
@UseI18n()
@Controller()
class DemoController {
  constructor(@ApiInject() private localeContext: LocaleContext) {}

  @Get('/ok')
  ok() {
    // message 与 data 都含占位
    return new GenericReturnMessageDto<string>(200, '#{ok}', '#{hello}');
  }

  @Get('/complex')
  complex() {
    return new GenericReturnMessageDto<string>(
      200,
      '#{ blue sky with {{ ocean }} }',
      '#{ {"a":1,"b":{"c":2}} }',
    );
  }

  @Get('/error')
  error() {
    // 直接把 BlankReturnMessageDto 包到 HttpException（I18nInterceptor 会翻译 body）
    throw new BlankReturnMessageDto(400, '#{bad}').toException();
  }

  @Get('/get-locale')
  getLocale(@PutLocale() locale: string) {
    return new GenericReturnMessageDto(200, 'success', locale);
  }

  @Get('/get-locale-query')
  getLocaleQuery(
    @PutLocale({ paramType: 'query', paramName: 'lang' }) locale: string,
  ) {
    return new GenericReturnMessageDto(200, 'success', locale);
  }

  @Get('/with-empty')
  withEmpty() {
    return new GenericReturnMessageDto<string>(
      200,
      '#{empty}',
      'There is nothing: #{empty}',
    );
  }

  @Get('/fallback-test')
  fallbackTest() {
    return new GenericReturnMessageDto<string>(
      200,
      '#{thingOnlyInEn}',
      '#{thingOnlyInZh}',
    );
  }

  @Get('/locale-context')
  async testLocaleContext() {
    const locale = this.localeContext.locale;
    const translated = await this.localeContext.translate('#{ok}');
    return new GenericReturnMessageDto<string>(
      200,
      'success',
      `${locale} - ${translated}`,
    );
  }
}

@Module({
  controllers: [DemoController],
  imports: [I18nModule],
})
class DemoModule {}

describe('i18n e2e', () => {
  let app: INestApplication;
  let i18n: I18nService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DemoModule],
    }).compile();

    app = moduleRef.createNestApplication();
    i18n = app.get(I18nService);

    // 注入字典查找中间件（最长前缀匹配）
    i18n.middleware(I18nLookupMiddleware(DICT, { matchType: 'hierarchy' }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('translates message and data with header locale (longest prefix zh-Hans-CN → zh-Hans)', async () => {
    const res = await request(app.getHttpServer())
      .get('/ok')
      .set('X-Lang', 'zh-Hans-CN')
      .expect(200);

    // message: '#{ok}' → '成功'
    expect(res.body.message).toBe('成功');
    // data: '#{hello}' → '你好'
    expect(res.body.data).toBe('你好');
    // DTO fixed fields
    expect(res.body.success).toBe(true);
    expect(typeof res.body.timestamp).toBeDefined();
  });

  it('falls back to default locale when unknown (xx → en)', async () => {
    const res = await request(app.getHttpServer())
      .get('/ok')
      .set('X-Lang', 'xx')
      .expect(200);
    expect(res.body.message).toBe('success');
    expect(res.body.data).toBe('hello');
  });

  it('supports complex placeholder with nested braces and JSON placeholder', async () => {
    const res = await request(app.getHttpServer())
      .get('/complex')
      .set('X-Lang', 'zh-Hans-CN')
      .expect(200);

    // message: '#{ blue sky with {{ ocean }} }' → '蓝天和大海'
    expect(res.body.message).toBe('蓝天和大海');

    // data: '#{ {"a":1,"b":{"c":2}} }' → 'JSON 对象'
    expect(res.body.data).toBe('JSON 对象');
  });

  it('translates HttpException body via interceptor', async () => {
    const res = await request(app.getHttpServer())
      .get('/error')
      .set('X-Lang', 'zh-Hans-CN')
      .expect(400);

    // HttpException body 的 message 也应被翻译
    expect(res.body.message).toBe('错误请求');
    expect(res.body.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('gets locale via PutLocale decorator with header resolver', async () => {
    const res = await request(app.getHttpServer())
      .get('/get-locale')
      .set('X-Lang', 'zh-Hans-CN')
      .expect(200);

    expect(res.body.data).toBe('zh-Hans');
  });

  it('gets locale via PutLocale decorator with query resolver', async () => {
    const res = await request(app.getHttpServer())
      .get('/get-locale-query?lang=zh-Hant')
      .expect(200);

    expect(res.body.data).toBe('zh');
  });

  it('should translate to empty string correctly', async () => {
    const res = await request(app.getHttpServer())
      .get('/with-empty')
      .set('X-Lang', 'zh-Hans-CN')
      .expect(200);

    expect(res.body.message).toBe(''); // '#{empty}' → ''
    expect(res.body.data).toBe('There is nothing: '); // 'There is nothing: #{empty}' → 'There is nothing: '
  });

  it('should fallback to default locale for empty locale', async () => {
    const res = await request(app.getHttpServer())
      .get('/fallback-test')
      .set('X-Lang', 'zh-Hans-CN')
      .expect(200);
    expect(res.body.message).toBe('This key is only in en locale'); // '#{thingOnlyInEn}' → fallback to en
    expect(res.body.data).toBe('此键仅在 zh 语言中存在'); // '#{thingOnlyInZh}' → fallback to zh
  });

  it('should use LocaleContext to get locale and translate', async () => {
    const res = await request(app.getHttpServer())
      .get('/locale-context')
      .set('X-Lang', 'zh-Hans-CN')
      .expect(200);
    expect(res.body.data).toBe('zh-Hans - 成功');
  });

  it('contains api headers metadata for locale resolver', () => {
    class C1 {
      constructor(@ApiInject() ctx: LocaleContext) {}
    }

    const headers = getApiHeadersMeta(C1);
    expect(headers).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'x-lang' })]),
    );
  });
});
