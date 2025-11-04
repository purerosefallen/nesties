// aborted.forRoot-feature.e2e.spec.ts
import 'reflect-metadata';
import { Controller, Get, HttpException, Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AbortableModule, InjectAbortable } from '../src/abortable-module';

jest.useRealTimers();
jest.setTimeout(15000);

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 示例 Service：含同步方法、属性 Promise、方法 Promise，用于验证代理行为 */
@Injectable()
class DemoService {
  n = 0;
  inc() {
    this.n++;
    return this.n;
  }
  readonly p = delay(30).then(() => 42);
  async foo() {
    await delay(30);
    return 7;
  }
}

// 用于观测服务端是否确实走到了 AbortedError 分支
const events: string[] = [];

const isAbortedError = (e: any): e is HttpException => {
  return (
    e instanceof HttpException && e.getStatus() === 499 // Client Closed Request
  );
};

@Controller()
class DemoController {
  constructor(
    // ✅ 无参写法，依赖 @InjectAbortable() 自动按 design:paramtypes 推断 DemoService
    @InjectAbortable() private readonly svc: DemoService,
  ) {}

  @Get('/ok')
  async ok() {
    const a = this.svc.inc();
    const pv = await this.svc.p; // 属性上的 Promise
    const fv = await this.svc.foo(); // 方法返回 Promise
    return { a, p: pv, f: fv };
  }

  // 直接 await promise 的路径：中途客户端断开时，服务端应在 then/await 处拿到 AbortedError
  @Get('/slow/await')
  async slowAwait() {
    try {
      const v = await this.svc.foo();
      return { v };
    } catch (e) {
      if (isAbortedError(e)) {
        events.push('slowAwait:aborted');
      }
      throw e;
    }
  }

  // 先拿到 Promise，稍后在 then 挂链：中途 abort 时，应在“挂接 then 的瞬间”返回拒绝的真 Promise
  @Get('/slow/then')
  async slowThen() {
    const p = this.svc.foo(); // 被代理的真 Promise（Proxy）
    await delay(5); // 给测试端时间去 abort
    try {
      const v = await (p as any).then((x: number) => x * 2);
      return { v };
    } catch (e) {
      if (isAbortedError(e)) {
        events.push('slowThen:aborted');
      }
      throw e;
    }
  }

  @Get('/events')
  getEvents() {
    return { events };
  }
}

describe('AbortableModule (forRoot / forFeature) e2e', () => {
  let app: any;

  beforeAll(async () => {
    const modRef = await Test.createTestingModule({
      imports: [
        AbortableModule.forRoot(),
        AbortableModule.forFeature([DemoService]),
      ],
      controllers: [DemoController],
      providers: [DemoService],
    }).compile();

    app = modRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    events.length = 0;
  });

  it('未 abort：属性读取/方法调用/Promise 均正常', async () => {
    await request(app.getHttpServer())
      .get('/ok')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ a: 1, p: 42, f: 7 });
      });
  });

  it('中途 abort（await 分支）：服务端通过代理拿到 AbortedError（用 /events 侧验）', async () => {
    const http = request(app.getHttpServer());
    const t = http.get('/slow/await');

    // 让服务端进入 await，然后客户端中断连接
    setTimeout(() => t.abort(), 8);

    // supertest 这边会因客户端 abort 抛出网络错误，忽略即可
    await (async () => {
      try {
        await t;
      } catch {
        /* expected */
      }
    })();

    // 等服务端 catch 并打点
    await delay(25);

    await request(app.getHttpServer())
      .get('/events')
      .expect(200)
      .expect(({ body }) => {
        expect(body.events).toContain('slowAwait:aborted');
      });
  });

  it('中途 abort（then 分支）：在挂接 then/catch/finally 时返回拒绝的真 Promise', async () => {
    const http = request(app.getHttpServer());
    const t = http.get('/slow/then');

    setTimeout(() => t.abort(), 8);

    await (async () => {
      try {
        await t;
      } catch {
        /* expected */
      }
    })();

    await delay(25);

    await request(app.getHttpServer())
      .get('/events')
      .expect(200)
      .expect(({ body }) => {
        expect(body.events).toContain('slowThen:aborted');
      });
  });
});
