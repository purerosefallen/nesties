import type { IncomingMessage } from 'node:http';
import type { Request } from 'express';
import type { FastifyRequest } from 'fastify';
import { Controller, Get, Req } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { ModuleRef } from '@nestjs/core';
import { NodeAdapter, NodeRequest } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { expectTypeOf } from 'vitest';
import {
  AnyReq,
  ParamResolver,
  TransformParamResolver,
  createLambdaParamResolver,
  createResolver,
  getParamResolver,
} from '../src/resolver';
import type { HttpRequest } from '../src/utility/abort-http-signal';

const nativeHeaderResolver = new ParamResolver<NodeRequest>({
  paramType: 'header',
  paramName: 'X-LaNg',
  required: true,
});
const NativeHeader = nativeHeaderResolver.toParamDecorator();
const acceptLanguageResolver = new ParamResolver<NodeRequest>({
  paramType: 'header',
  paramName: 'Accept-Language',
});
const AcceptLanguage = acceptLanguageResolver.toParamDecorator();

@Controller('native-headers')
class NativeHeadersController {
  @Get()
  read(
    @NativeHeader() lang: string,
    @AcceptLanguage() acceptLanguage: string,
    @Req() req: NodeRequest,
  ) {
    return { lang, acceptLanguage, native: req instanceof NodeRequest };
  }
}

describe('neutral request contract', () => {
  it('accepts adapter requests and native Node messages without casts', () => {
    expectTypeOf<Request>().toExtend<AnyReq>();
    expectTypeOf<NodeRequest>().toExtend<AnyReq>();
    expectTypeOf<FastifyRequest>().toExtend<AnyReq>();
    expectTypeOf<IncomingMessage>().toExtend<AnyReq>();
    expectTypeOf<Request>().toExtend<HttpRequest>();
    expectTypeOf<NodeRequest>().toExtend<HttpRequest>();
    expectTypeOf<FastifyRequest>().toExtend<HttpRequest>();
    expectTypeOf<IncomingMessage>().toExtend<HttpRequest>();
  });

  it('preserves request types through dynamic resolvers and helpers', () => {
    const nodeResolver = new ParamResolver<NodeRequest>((req) => req.ip);
    const expressResolver = new ParamResolver((req: Request) => req.ip);
    const fastifyResolver = getParamResolver((req: FastifyRequest) => req.ip);
    const fn = createResolver((req: NodeRequest) => req.ip);
    const transformed = new TransformParamResolver(
      nodeResolver,
      (value, _ref, req) => {
        expectTypeOf(req).toEqualTypeOf<NodeRequest>();
        return value;
      },
    );
    const lambda = createLambdaParamResolver<
      string | undefined,
      string,
      NodeRequest
    >((value, _ref, req) => value || req.ip || '')(nodeResolver);

    expectTypeOf(nodeResolver.resolve)
      .parameter(0)
      .toEqualTypeOf<NodeRequest>();
    expectTypeOf(expressResolver.resolve).parameter(0).toEqualTypeOf<Request>();
    expectTypeOf(fastifyResolver.resolve)
      .parameter(0)
      .toEqualTypeOf<FastifyRequest>();
    expectTypeOf(fn).parameter(0).toEqualTypeOf<NodeRequest>();
    expectTypeOf(transformed.resolve).parameter(0).toEqualTypeOf<NodeRequest>();
    expectTypeOf(lambda.resolve).parameter(0).toEqualTypeOf<NodeRequest>();
  });

  it.each<[string, AnyReq, string]>([
    ['plain headers', { headers: { 'X-LANG': 'zh' } }, 'zh'],
    ['array headers', { headers: { 'x-lang': ['zh', 'en'] } }, 'zh'],
    ['getHeader helper', { getHeader: () => 'zh' }, 'zh'],
    ['header helper', { header: () => 'zh' }, 'zh'],
    ['get helper', { get: () => 'zh' }, 'zh'],
  ])('reads %s on structural requests', async (_name, req, expected) => {
    const resolver = new ParamResolver({
      paramType: 'header',
      paramName: 'X-Lang',
    });
    expect(await resolver.resolve(req, {} as ModuleRef)).toBe(expected);
  });
});

describe('native Node header resolution', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [NativeHeadersController],
    }).compile();
    app = moduleRef.createNestApplication(new NodeAdapter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each(['x-lang', 'X-LANG', 'X-LaNg'])(
    'resolves %s and Accept-Language on a real NodeRequest',
    async (name) => {
      const response = await request(app.getHttpServer())
        .get('/native-headers')
        .set(name, 'zh-Hans')
        .set('Accept-Language', 'zh-Hans-CN;q=0.9, en;q=0.8')
        .expect(200);
      expect(response.body).toEqual({
        lang: 'zh-Hans',
        acceptLanguage: 'zh-Hans-CN',
        native: true,
      });
    },
  );

  it('rejects missing required headers on a real NodeRequest', async () => {
    const response = await request(app.getHttpServer())
      .get('/native-headers')
      .expect(400);
    expect(response.body.message).toContain("Required parameter 'x-lang'");
  });
});
