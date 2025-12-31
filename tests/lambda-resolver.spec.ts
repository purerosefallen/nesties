// lambda-resolver.spec.ts
import {
  Controller,
  Get,
  INestApplication,
  Module,
  Query,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { ParamResolver } from '../src/resolver';
import {
  DefaultValueParamResolver,
  ParseBase64ParamResolver,
  ParseBoolParamResolver,
  ParseDateParamResolver,
  ParseFloatParamResolver,
  ParseIntParamResolver,
} from '../src/resolver';

/**
 * 这组测试覆盖：
 * - createLambdaParamResolver / TransformParamResolver 的“可组合”行为
 * - ParseInt / Float / Bool / Date / Base64 的成功 + 失败（400）路径
 * - DefaultValueParamResolver 的缺省兜底路径
 * - base64url（- _ 且可无 padding）的支持
 */

// ----------------- 基础 query resolver -----------------
const qX = new ParamResolver({ paramType: 'query', paramName: 'x' });
const qB = new ParamResolver({ paramType: 'query', paramName: 'b' });
const qD = new ParamResolver({ paramType: 'query', paramName: 'd' });
const qS = new ParamResolver({ paramType: 'query', paramName: 's' });

// ----------------- lambda resolvers（Transform） -----------------
const XInt = ParseIntParamResolver(qX).toParamDecorator();
const XFloat = ParseFloatParamResolver(qX).toParamDecorator();
const XBool = ParseBoolParamResolver(qB).toParamDecorator();
const XDate = ParseDateParamResolver(qD).toParamDecorator();
const XBase64 = ParseBase64ParamResolver(qS).toParamDecorator();

// DefaultValue + ParseInt（注意顺序：先 Default，再 Parse）
const XDefaultStr = DefaultValueParamResolver(qX, '42');
const XDefaultInt = ParseIntParamResolver(XDefaultStr).toParamDecorator();

@Controller()
class LambdaResolverDemoController {
  @Get('/int')
  int(@XInt() v: number) {
    return { value: v };
  }

  @Get('/float')
  float(@XFloat() v: number) {
    return { value: v };
  }

  @Get('/bool')
  bool(@XBool() v: boolean) {
    return { value: v };
  }

  @Get('/date')
  date(@XDate() v: Date) {
    // 用 ISO 字符串方便断言
    return { value: v.toISOString() };
  }

  @Get('/b64')
  b64(@XBase64() buf: Buffer) {
    // 用 utf8 字符串方便断言（hello 等）
    return { value: buf.toString('utf8') };
  }

  @Get('/b64hex')
  b64hex(@XBase64() buf: Buffer) {
    // 用 hex 方便断言二进制（+/8= / -_8 之类）
    return { value: buf.toString('hex') };
  }

  @Get('/default-int')
  defaultInt(@XDefaultInt() v: number) {
    return { value: v };
  }

  // 备用：直接用 query 验证缺参时 controller 能访问
  @Get('/raw')
  raw(@Query('x') x?: string) {
    return { x };
  }
}

@Module({
  controllers: [LambdaResolverDemoController],
})
class LambdaResolverDemoModule {}

describe('lambda resolvers (createLambdaParamResolver) e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LambdaResolverDemoModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ----------------- ParseInt -----------------

  it('ParseIntParamResolver: parses integer', async () => {
    const res = await request(app.getHttpServer())
      .get('/int?x=123')
      .expect(200);

    expect(res.body.value).toBe(123);
  });

  it('ParseIntParamResolver: returns 400 on invalid integer', async () => {
    const res = await request(app.getHttpServer())
      .get('/int?x=abc')
      .expect(400);

    expect(JSON.stringify(res.body)).toContain('Invalid integer parameter');
  });

  // ----------------- ParseFloat -----------------

  it('ParseFloatParamResolver: parses float', async () => {
    const res = await request(app.getHttpServer())
      .get('/float?x=1.25')
      .expect(200);

    expect(res.body.value).toBe(1.25);
  });

  it('ParseFloatParamResolver: returns 400 on invalid float', async () => {
    const res = await request(app.getHttpServer())
      .get('/float?x=wat')
      .expect(400);

    expect(JSON.stringify(res.body)).toContain('Invalid float parameter');
  });

  // ----------------- ParseBool -----------------
  // 这里不强行测 parseBool 的全部语义（因为你们 parseBool 的规则可能比较丰富）
  // 只测最常见输入能跑通即可

  it('ParseBoolParamResolver: parses true', async () => {
    const res = await request(app.getHttpServer())
      .get('/bool?b=true')
      .expect(200);

    expect(res.body.value).toBe(true);
  });

  it('ParseBoolParamResolver: parses false', async () => {
    const res = await request(app.getHttpServer())
      .get('/bool?b=false')
      .expect(200);

    expect(res.body.value).toBe(false);
  });

  // ----------------- ParseDate -----------------

  it('ParseDateParamResolver: parses ISO date string', async () => {
    const res = await request(app.getHttpServer())
      .get('/date?d=2025-12-31T00:00:00.000Z')
      .expect(200);

    expect(res.body.value).toBe('2025-12-31T00:00:00.000Z');
  });

  it('ParseDateParamResolver: returns 400 on invalid date', async () => {
    const res = await request(app.getHttpServer())
      .get('/date?d=not-a-date')
      .expect(400);

    expect(JSON.stringify(res.body)).toContain('Invalid date parameter');
  });

  // ----------------- ParseBase64 (base64 + base64url) -----------------

  it('ParseBase64ParamResolver: decodes base64 payload', async () => {
    // "hello" -> aGVsbG8=
    const res = await request(app.getHttpServer())
      .get('/b64?s=aGVsbG8=')
      .expect(200);

    expect(res.body.value).toBe('hello');
  });

  it('ParseBase64ParamResolver: supports base64url without padding', async () => {
    // bytes [0xfb, 0xff] => base64 "+/8=" => base64url "-_8" (no padding)
    const res = await request(app.getHttpServer())
      .get('/b64hex?s=-_8')
      .expect(200);

    expect(res.body.value).toBe('fbff');
  });

  it('ParseBase64ParamResolver: returns 400 on invalid base64', async () => {
    // 明显非法字符
    const res = await request(app.getHttpServer())
      .get('/b64?s=@@@')
      .expect(400);

    expect(JSON.stringify(res.body)).toContain('Invalid base64 parameter');
  });

  // ----------------- DefaultValue -----------------

  it('DefaultValueParamResolver + ParseInt: uses default when missing', async () => {
    const res = await request(app.getHttpServer())
      .get('/default-int')
      .expect(200);

    expect(res.body.value).toBe(42);
  });

  it('DefaultValueParamResolver + ParseInt: parses provided value instead of default', async () => {
    const res = await request(app.getHttpServer())
      .get('/default-int?x=7')
      .expect(200);

    expect(res.body.value).toBe(7);
  });

  it('DefaultValueParamResolver + ParseInt: still returns 400 if provided value is invalid', async () => {
    const res = await request(app.getHttpServer())
      .get('/default-int?x=wat')
      .expect(400);

    expect(JSON.stringify(res.body)).toContain('Invalid integer parameter');
  });
});
