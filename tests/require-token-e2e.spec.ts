import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';

import { RequireToken, TokenGuard } from '../src/token.guard';

// ===== Mock ConfigService =====
// 让 Guard 有一个固定可取到的服务端 token：SERVER_TOKEN=S3CR3T
class FakeConfigService {
  private readonly store = new Map<string, string>([
    ['SERVER_TOKEN', 'S3CR3T'],
    ['ALT_TOKEN', 'ALT'],
    // 故意不放 NOT_EXISTS_KEY，用于“配置项不存在应放行”的测试
  ]);

  get<T = string>(key: string): T | undefined {
    return this.store.get(key) as unknown as T | undefined;
  }
}

// ===== Controllers under test =====

@Controller('default')
class DefaultController {
  // 默认：从 header 'x-server-token' 取；与 SERVER_TOKEN 比较
  @Get()
  @RequireToken()
  hello() {
    return { ok: true, where: 'default' };
  }
}

@Controller('custom-status')
class CustomStatusController {
  // 自定义 errorCode（实现已改为按 options.errorCode 抛错）
  @Get()
  @RequireToken({ errorCode: 499 })
  hello() {
    return { ok: true, where: 'custom-status' };
  }
}

@Controller('custom-resolver')
class CustomResolverController {
  // 自定义 resolver：从 query 里读取 token
  @Get()
  @RequireToken({
    resolver: { paramType: 'query', paramName: 'token' },
  })
  hello() {
    return { ok: true, where: 'custom-resolver' };
  }
}

@Controller('config-missing')
class ConfigMissingController {
  // 指向一个 ConfigService 中不存在的 key；应当放行（无论是否带 token）
  @Get()
  @RequireToken({
    tokenSource: 'NOT_EXISTS_KEY',
  })
  hello() {
    return { ok: true, where: 'config-missing' };
  }
}

@Controller('factory-token')
class FactoryTokenController {
  // 工厂式（函数）提供服务端 token：返回 'ALT'
  @Get('sync-factory')
  @RequireToken({
    tokenSource: () => 'ALT',
  })
  syncFactory() {
    return { ok: true, where: 'factory-token:sync' };
  }

  // 也测一个异步工厂，返回 Promise<'ALT'>
  @Get('async-factory')
  @RequireToken({
    tokenSource: async () => {
      // 模拟异步来源，比如 Vault / 远程配置
      await new Promise((r) => setTimeout(r, 1));
      return 'ALT';
    },
  })
  asyncFactory() {
    return { ok: true, where: 'factory-token:async' };
  }
}

// ===== E2E test module =====

@Module({
  controllers: [
    DefaultController,
    CustomStatusController,
    CustomResolverController,
    ConfigMissingController,
    FactoryTokenController,
  ],
  providers: [
    TokenGuard,
    { provide: ConfigService, useClass: FakeConfigService },
  ],
})
class E2eTestModule {}

describe('RequireToken e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [E2eTestModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('默认情况（header: x-server-token）', () => {
    it('should return 401 when header is missing', async () => {
      await request(app.getHttpServer()).get('/default').expect(401);
    });

    it('should return 401 when token is invalid', async () => {
      await request(app.getHttpServer())
        .get('/default')
        .set('x-server-token', 'WRONG')
        .expect(401);
    });

    it('should return 200 when token is correct', async () => {
      await request(app.getHttpServer())
        .get('/default')
        .set('x-server-token', 'S3CR3T')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ ok: true, where: 'default' });
        });
    });
  });

  describe('自定义 statusCode 的情况（实现为使用 options.errorCode）', () => {
    it('should return 499 when header is missing', async () => {
      await request(app.getHttpServer()).get('/custom-status').expect(499);
    });

    it('should return 499 when token is invalid', async () => {
      await request(app.getHttpServer())
        .get('/custom-status')
        .set('x-server-token', 'WRONG')
        .expect(499);
    });

    it('should return 200 when token is correct', async () => {
      await request(app.getHttpServer())
        .get('/custom-status')
        .set('x-server-token', 'S3CR3T')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ ok: true, where: 'custom-status' });
        });
    });
  });

  describe('自定义 resolver（从 query 读取 token）', () => {
    it('should return 401 when query token is missing', async () => {
      await request(app.getHttpServer()).get('/custom-resolver').expect(401);
    });

    it('should return 401 when query token is invalid', async () => {
      await request(app.getHttpServer())
        .get('/custom-resolver?token=WRONG')
        .expect(401);
    });

    it('should return 200 when query token is correct', async () => {
      await request(app.getHttpServer())
        .get('/custom-resolver?token=S3CR3T')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ ok: true, where: 'custom-resolver' });
        });
    });
  });

  describe('config 那个条目不存在的情况（应当放行）', () => {
    it('should return 200 when config key is missing and header is missing', async () => {
      await request(app.getHttpServer())
        .get('/config-missing')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ ok: true, where: 'config-missing' });
        });
    });

    it('should return 200 when config key is missing and token is invalid', async () => {
      await request(app.getHttpServer())
        .get('/config-missing')
        .set('x-server-token', 'WRONG')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ ok: true, where: 'config-missing' });
        });
    });

    it('should return 200 when config key is missing and token is correct', async () => {
      await request(app.getHttpServer())
        .get('/config-missing')
        .set('x-server-token', 'S3CR3T')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ ok: true, where: 'config-missing' });
        });
    });
  });

  describe('工厂式输入 token（tokenSource 是函数/异步函数）', () => {
    it('should return 401 when header is missing (sync factory)', async () => {
      await request(app.getHttpServer())
        .get('/factory-token/sync-factory')
        .expect(401);
    });

    it('should return 401 when token is invalid (sync factory)', async () => {
      await request(app.getHttpServer())
        .get('/factory-token/sync-factory')
        .set('x-server-token', 'WRONG')
        .expect(401);
    });

    it('should return 200 when token is correct (sync factory)', async () => {
      await request(app.getHttpServer())
        .get('/factory-token/sync-factory')
        .set('x-server-token', 'ALT')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ ok: true, where: 'factory-token:sync' });
        });
    });

    it('should return 401 when header is missing (async factory)', async () => {
      await request(app.getHttpServer())
        .get('/factory-token/async-factory')
        .expect(401);
    });

    it('should return 401 when token is invalid (async factory)', async () => {
      await request(app.getHttpServer())
        .get('/factory-token/async-factory')
        .set('x-server-token', 'WRONG')
        .expect(401);
    });

    it('should return 200 when token is correct (async factory)', async () => {
      await request(app.getHttpServer())
        .get('/factory-token/async-factory')
        .set('x-server-token', 'ALT')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ ok: true, where: 'factory-token:async' });
        });
    });
  });
});
