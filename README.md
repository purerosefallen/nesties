# Nesties

**Nest.js utilities**

Nesties is a utility library for Nest.js applications, designed to simplify and enhance common patterns such as decorators, response structures, request validation, and HTTP-level concerns such as tokens and i18n. This library provides a set of utilities to streamline your development workflow and improve code reuse and clarity when working with Nest.js.

## Features

- **Decorator Merging**: Merge multiple property, method, class, and parameter decorators.
- **Predefined API Responses**: Simplified and consistent response structures for APIs.
- **Data Validation Pipes**: Validation pipe utilities to handle query and body validation effortlessly.
- **Custom Guards**: Easily implement token-based guards and API header validation.
- **ParamResolver utilities**: Strongly-typed access to headers and query parameters, including dynamic and request-scoped resolvers.
- **Pagination and Return DTOs**: DTOs for standard and paginated API responses.
- **AbortableModule**: Request-lifetime-aware abort signals for long-running work.
- **I18nModule**: Locale-aware translation for response DTOs and strings.

## Installation

To install Nesties, use npm or yarn:

```bash
npm install nesties
```

or

```bash
yarn add nesties
```

## Usage

### 1. Merging Decorators

Nesties allows you to merge multiple decorators of the same type (property, method, class, or parameter). This is useful when you want to combine the functionality of several decorators into one.

- **Property Decorator**

```ts
import { MergePropertyDecorators } from 'nesties';

const CombinedPropertyDecorator = MergePropertyDecorators([Decorator1, Decorator2]);
```

- **Method Decorator**

```ts
import { MergeMethodDecorators } from 'nesties';

const CombinedMethodDecorator = MergeMethodDecorators([Decorator1, Decorator2]);
```

- **Class Decorator**

```ts
import { MergeClassDecorators } from 'nesties';

const CombinedClassDecorator = MergeClassDecorators([Decorator1, Decorator2]);
```

- **Parameter Decorator**

```ts
import { MergeParameterDecorators } from 'nesties';

const CombinedParameterDecorator = MergeParameterDecorators([Decorator1, Decorator2]);
```

### 2. API Response Decorators

Nesties includes a utility for defining API error responses conveniently.

```ts
import { ApiError } from 'nesties';

@ApiError(401, 'Unauthorized access')
```

### 3. Validation Pipes

Nesties provides utilities for creating validation pipes with automatic data transformation and validation.

- **Data Pipe**

```ts
import { DataPipe } from 'nesties';

const validationPipe = DataPipe();
```

- **Decorators for Request Validation**

```ts
import { DataQuery, DataBody } from 'nesties';

class ExampleController {
  myMethod(@DataQuery() query: MyQueryDto, @DataBody() body: MyBodyDto) {
    // ...
  }
}
```

### 4. Return Message DTOs

Nesties provides a set of DTOs for consistent API response structures, and it also includes a utility function `ReturnMessageDto` to generate DTOs dynamically based on the provided class type.

- **BlankReturnMessageDto**: A basic structure for returning status and message information.
- **GenericReturnMessageDto**: A generic version for responses that include data.
- **PaginatedReturnMessageDto**: For paginated responses, including metadata about pagination.
- **ReturnMessageDto**: A utility function for generating DTOs based on a class type.

```ts
import {
  BlankReturnMessageDto,
  GenericReturnMessageDto,
  PaginatedReturnMessageDto,
  ReturnMessageDto,
} from 'nesties';

const response = new GenericReturnMessageDto(
  200,
  'Operation successful',
  myData,
);
```

#### Example Usage of `ReturnMessageDto`

`ReturnMessageDto` allows you to generate a DTO dynamically based on the structure of a provided class. This is useful when you want to create a standardized response that includes custom data types.

Suppose we have a `User` class:

```ts
import { ApiProperty } from '@nestjs/swagger';

class User {
  @ApiProperty({ description: 'The unique ID of the user', type: Number })
  id: number;

  @ApiProperty({ description: 'The name of the user', type: String })
  name: string;

  @ApiProperty({ description: 'The email address of the user', type: String })
  email: string;
}
```

You can create a return message DTO for this class:

```ts
import { ReturnMessageDto } from 'nesties';

class UserReturnMessageDto extends ReturnMessageDto(User) {}

const response = new UserReturnMessageDto(200, 'Success', {
  id: 1,
  name: 'John Doe',
  email: 'john.doe@example.com',
});
```

This approach automatically creates a DTO structure with the properties of `User` integrated as the `data` field, ensuring consistency and reusability in your API responses.

### 5. Token Guard

`TokenGuard` validates a single “server token” before invoking a controller method. By default it reads `SERVER_TOKEN` from `ConfigService` and compares it with the `x-server-token` header, returning a `401` when they differ.

Internally, `TokenGuard` uses the same resolver primitives as `ParamResolver`, so you can read tokens from headers, query parameters, or custom logic that depends on the request and `ModuleRef`.

#### Quick start (defaults only)

1. **Load the config module**

   ```ts
   import { ConfigModule } from '@nestjs/config';

   @Module({
     imports: [ConfigModule.forRoot()],
   })
   export class AppModule {}
   ```

2. **Set the secret**

   ```text
   SERVER_TOKEN=your-secure-token
   ```

3. **Decorate the route**

   ```ts
   import { Controller, Get } from '@nestjs/common';
   import { RequireToken } from 'nesties';

   @Controller('secure')
   export class SecureController {
     @Get()
     @RequireToken() // expects x-server-token to match SERVER_TOKEN
     secureEndpoint() {
       return { message: 'Valid server token supplied' };
     }
   }
   ```

`RequireToken()` installs `TokenGuard`, generates the Swagger header metadata automatically, and documents the `401` response. If `SERVER_TOKEN` is empty (e.g., local dev) the guard becomes a no-op so you can disable it without touching code.

#### Advanced configuration

When you need to override the defaults, pass options into `RequireToken`:

- `resolver` (default: `{ paramType: 'header', paramName: 'x-server-token' }`): where to read the **client** token from. Accepts any **ParamResolver input**:
  - a static header/query descriptor: `{ paramType: 'header' | 'query', paramName: string }`
  - a `ParamResolver` instance
- `tokenSource` (default: `'SERVER_TOKEN'`): how to read the **server** token. Provide another config key or an async resolver `(req, moduleRef) => Promise<string | undefined>` for dynamic sources.
- `errorCode` (default: `401`): HTTP status when tokens do not match.

```ts
import { Controller, Get } from '@nestjs/common';
import { RequireToken } from 'nesties';

@Controller('api')
export class ApiController {
  @Get('protected')
  @RequireToken({
    resolver: { paramType: 'query', paramName: 'token' },
    tokenSource: 'INTERNAL_TOKEN',
    errorCode: 498,
  })
  fetch() {
    return { data: 'guarded' };
  }
}
```

Multi-tenant secrets are just another `tokenSource` resolver. You can compose them using `ParamResolver`:

```ts
import { ConfigService } from '@nestjs/config';
import { ParamResolver } from 'nesties';

const tenantIdResolver = new ParamResolver({
  paramType: 'header',
  paramName: 'x-tenant-id',
});

@RequireToken({
  resolver: { paramType: 'header', paramName: 'x-tenant-token' },
  tokenSource: async (req, moduleRef) => {
    // reuse the same ParamResolver primitives
    const getTenantId = tenantIdResolver.toResolverFunction();
    const tenantId = await getTenantId(req, moduleRef);

    const config = moduleRef.get(ConfigService);
    return tenantId
      ? config.get<string>(`TENANT_${tenantId}_TOKEN`)
      : undefined;
  },
})
export class TenantController {
  // ...
}
```

`TokenGuard` only throws when both values exist and differ, so clearing the config value temporarily disables the guard without a code change.

### 6. AbortableModule

Use `AbortableModule` when you want long-running providers to respect the lifetime of the HTTP request. The module exposes a request-scoped `AbortSignal` and wraps existing providers with [`nfkit`](https://www.npmjs.com/package/nfkit)'s `abortable` helper so that work can be canceled automatically when the client disconnects.

```ts
import { AbortableModule, InjectAbortable } from 'nesties';

@Module({
  imports: [
    AbortableModule.forRoot(), // registers the request-level AbortSignal
    AbortableModule.forFeature([DemoService]), // wrap DemoService with an abortable proxy
  ],
})
export class DemoModule {
  constructor(@InjectAbortable() private readonly demo: DemoService) {}

  getData() {
    return this.demo.expensiveCall(); // aborts when request ends
  }
}
```

- `AbortableModule.forRoot()` should be added once (typically in `AppModule`) to expose the shared `AbortSignal`.
- `AbortableModule.forFeature([Token], { abortableOptions })` registers one or more providers that will be resolved per request and automatically wrapped in an abortable proxy.
- `@InjectAbortable()` can infer the token type automatically, or accept an explicit injection token, and `InjectAbortSignal()` gives direct access to the `AbortSignal` if you need to manage cancellation manually.

#### Injecting `AbortSignal` with `@nestjs/axios`

```ts
import { HttpModule, HttpService } from '@nestjs/axios';
import {
  AbortableModule,
  InjectAbortable,
  InjectAbortSignal,
} from 'nesties';

@Module({
  imports: [
    HttpModule,
    AbortableModule.forRoot(),
    AbortableModule.forFeature([HttpService]),
  ],
})
export class WeatherModule {
  constructor(
    @InjectAbortable() private readonly http: HttpService,
    @InjectAbortSignal() private readonly abortSignal: AbortSignal,
  ) {}

  async fetchForecast() {
    const { data } = await this.http.axiosRef.get(
      'https://api.example.com/weather',
      { signal: this.abortSignal },
    );
    return data;
  }
}
```

The wrapped `HttpService` observes the same abort signal as the request, so in-flight HTTP calls will be canceled as soon as the client disconnects or Nest aborts the request scope.

### 7. I18nModule

Nesties also ships an opinionated but flexible internationalization module. The typical workflow is to call `createI18n` to obtain `I18nModule` plus the `UseI18n` decorator, register locale lookup middleware (e.g., `I18nLookupMiddleware`), and then return DTOs that contain placeholders like `#{key}`—the interceptor installed by `@UseI18n()` will translate those placeholders automatically before the response leaves the server.

Internally, locale resolution uses the same resolver primitives as `ParamResolver`, so you can read the locale from headers, query parameters, or a custom `(req, moduleRef) => Promise<string | undefined>` function.

```ts
import {
  createI18n,
  I18nService,
  GenericReturnMessageDto,
  I18nLookupMiddleware,
} from 'nesties';

const { I18nModule, UseI18n } = createI18n({
  locales: ['en-US', 'zh-CN'],
  defaultLocale: 'en-US',
  // resolver: { paramType: 'header', paramName: 'accept-language' } by default
});

@Module({
  imports: [I18nModule],
})
export class AppModule {
  constructor(private readonly i18n: I18nService) {
    this.i18n.middleware(
      I18nLookupMiddleware({
        'en-US': { bar: 'Nesties' },
        'zh-CN': { bar: '奈斯提' },
      }),
    );
  }
}

@Controller()
@UseI18n()
export class GreetingController {
  @Get()
  async greet() {
    return new GenericReturnMessageDto(200, 'OK', {
      greeting: 'Hello #{bar}',
    });
  }
}
```

#### `@PutLocale()` Per-handler Overrides

`@PutLocale()` lets you override how the locale is resolved for a specific handler or parameter. It accepts the same inputs as `ParamResolver`:

- a static header/query descriptor: `{ paramType: 'header' | 'query', paramName: string }`
- a `ParamResolver` instance
- a dynamic resolver `(req, moduleRef) => Promise<string | undefined>`

When you pass a static descriptor, a `ParamResolver` is created under the hood:

```ts
import { GenericReturnMessageDto, PutLocale } from 'nesties';

@Controller('reports')
@UseI18n()
export class ReportController {
  @Get()
  async summary(
    @PutLocale({ paramType: 'query', paramName: 'locale' }) locale: string,
  ) {
    // locale now respects ?locale=...
    return new GenericReturnMessageDto(200, 'OK', {
      summary: 'report.summary',
    });
  }
}
```

You can also plug in dynamic logic using a `ParamResolver` instance:

```ts
import { ParamResolver, PutLocale } from 'nesties';
import { ContextIdFactory, ModuleRef } from '@nestjs/core';
import { LocaleService } from './locale.service';

const dynamicLocaleResolver = new ParamResolver(async (req, ref: ModuleRef) => {
  // example: delegate to a request-scoped LocaleService
  const contextId = ContextIdFactory.getByRequest(req);
  const svc = await ref.resolve(LocaleService, contextId, { strict: false });
  return svc.detectLocale(req);
});

@Controller('dynamic-reports')
@UseI18n()
export class DynamicReportController {
  @Get()
  async summary(@PutLocale(dynamicLocaleResolver) locale: string) {
    return new GenericReturnMessageDto(200, 'OK', {
      summary: 'dynamic.report.summary',
    });
  }
}
```

#### Custom Middleware with TypeORM

You can register any number of middlewares that resolve placeholders. The example below queries a TypeORM repository to fetch translations stored in a database and falls back to the next middleware when no record is found.

```ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Entity,
  Column,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { I18nService } from 'nesties';

@Entity()
export class Translation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  locale: string;

  @Column()
  key: string;

  @Column()
  value: string;
}

@Injectable()
export class TranslationMiddleware {
  constructor(
    private readonly i18n: I18nService,
    @InjectRepository(Translation)
    private readonly repo: Repository<Translation>,
  ) {
    this.i18n.middleware(this.lookupFromDatabase.bind(this));
  }

  private async lookupFromDatabase(
    locale: string,
    key: string,
    next: () => Promise<string | undefined>,
    ctx?: ExecutionContext,
  ) {
    const found = await this.repo.findOne({ where: { locale, key } });
    if (found) {
      return found.value;
    }
    return next();
  }
}
```

Register `TranslationMiddleware` in any module that also imports `TypeOrmModule.forFeature([Translation])` so the service is instantiated and its middleware is attached to `I18nService`.

By composing multiple middlewares (dictionaries, database lookups, remote APIs), you can build a tiered fallback chain that covers every translation source you need.

- `createI18n` returns both a configured module (`I18nModule`) and a decorator (`UseI18n`) that adds the bundled interceptor and Swagger metadata describing the locale resolver.
- `UseI18n` wires the interceptor that walks the returned DTO (e.g., `GenericReturnMessageDto`) and replaces every string that contains placeholders (`Hello #{key}`) using the locale detected from the incoming request.
- `I18nService.middleware` lets you register middlewares such as `I18nLookupMiddleware` for dictionary lookups, database resolvers, or remote translation APIs.
- `LocalePipe`/`PutLocale` provide ergonomic access to the resolved locale inside route handlers, and you can override the resolver per parameter when necessary.
- `I18nService.translate` and `translateString` remain available for advanced manual flows (generating strings outside of interceptor scope, building static assets, etc.).

### 8. ParamResolver

`ParamResolver` and `CombinedParamResolver` provide a small, composable abstraction over headers and query parameters. They are used internally by `TokenGuard`, the i18n utilities, and can also be used directly in controllers, pipes, and guards.

#### Static header / query resolvers

The simplest usage is to read a single header or query parameter:

```ts
import { Controller, Get } from '@nestjs/common';
import { ParamResolver } from 'nesties';

const langHeaderResolver = new ParamResolver({
  paramType: 'header',
  paramName: 'accept-language',
});

const LangHeader = langHeaderResolver.toParamDecorator();
const ApiLangHeader = langHeaderResolver.toApiPropertyDecorator();

@Controller()
export class LocaleController {
  @Get('header-locale')
  @ApiLangHeader() // documents the header in Swagger
  getLocale(@LangHeader() locale: string | undefined) {
    return { locale };
  }
}
```

For query parameters:

```ts
const langQueryResolver = new ParamResolver({
  paramType: 'query',
  paramName: 'locale',
});

const LangQuery = langQueryResolver.toParamDecorator();

@Controller()
export class QueryLocaleController {
  @Get('query-locale')
  getLocale(@LangQuery() locale: string | undefined) {
    return { locale };
  }
}
```

Static header resolvers normalize header names to lowercase and perform a best-effort lookup across `req.headers` and common Express-style helpers (`req.get`, `req.header`, `req.getHeader`). Query resolvers first consult `req.query`, then fall back to parsing the current URL when needed.

#### Dynamic resolvers with `ModuleRef`

When you need more control, `ParamResolver` also accepts a dynamic function `(req, moduleRef) => Promise<string | undefined>`. This is ideal for request-scoped dependencies or multi-step lookups.

```ts
import { ParamResolver } from 'nesties';
import { ContextIdFactory, ModuleRef } from '@nestjs/core';
import { RequestScopedLocaleService } from './locale.service';

const dynamicLocaleResolver = new ParamResolver(
  async (req, ref: ModuleRef) => {
    const contextId = ContextIdFactory.getByRequest(req);
    const svc = await ref.resolve(RequestScopedLocaleService, contextId, {
      strict: false,
    });
    return svc.detectLocale(req);
  },
);

const DynamicLocale = dynamicLocaleResolver.toParamDecorator();

@Controller()
export class DynamicLocaleController {
  @Get('dynamic-locale')
  getLocale(@DynamicLocale() locale: string | undefined) {
    return { locale };
  }
}
```

You can also call dynamic resolvers manually via `toResolverFunction()`:

```ts
import type { Request } from 'express';

@Injectable()
export class LocaleConsumerService {
  constructor(private readonly moduleRef: ModuleRef) {}

  async getLocale(req: Request) {
    const fn = dynamicLocaleResolver.toResolverFunction();
    return fn(req, this.moduleRef);
  }
}
```

#### Combining multiple resolvers

`CombinedParamResolver` lets you compose several resolvers into a single object result and merges their Swagger decorators.

```ts
import {
  CombinedParamResolver,
  ParamResolver,
  TypeFromParamResolver,
} from 'nesties';

const langResolver = new ParamResolver({
  paramType: 'header',
  paramName: 'accept-language',
});

const tokenResolver = new ParamResolver({
  paramType: 'header',
  paramName: 'x-access-token',
});

const combinedResolver = new CombinedParamResolver({
  lang: langResolver,
  token: tokenResolver,
});

type CombinedResult = TypeFromParamResolver<typeof combinedResolver>;
// CombinedResult = { lang: string | undefined; token: string | undefined }

const CombinedParam = combinedResolver.toParamDecorator();
const ApiCombined = combinedResolver.toApiPropertyDecorator();

@Controller()
export class CombinedController {
  @Get('combined')
  @ApiCombined()
  inspect(@CombinedParam() params: CombinedResult) {
    return params; // { lang, token }
  }
}
```

When used as a decorator, the combined resolver:

- Executes each underlying resolver in parallel (`Promise.all`)
- Returns a typed object where each key corresponds to the original resolver
- Emits merged Swagger metadata for all headers / queries involved

#### Request-scoped providers from resolvers

Sometimes you want to treat the resolved value itself as an injectable request-scoped provider. You can derive such a provider from any `ParamResolver` or `CombinedParamResolver` using `toRequestScopedProvider()`:

```ts
import { Module } from '@nestjs/common';
import { ParamResolver } from 'nesties';

const userIdResolver = new ParamResolver({
  paramType: 'header',
  paramName: 'x-user-id',
});

const userIdProviderMeta = userIdResolver.toRequestScopedProvider();

@Module({
  providers: [userIdProviderMeta.provider],
})
export class UserModule {
  constructor(
    @userIdProviderMeta.inject()
    private readonly userId: string | undefined,
  ) {}

  // userId is now resolved once per request and injectable anywhere in scope
}
```

This pattern is useful when you want to reuse the same resolver logic in guards, interceptors, and services without manually passing around the `Request` object.

#### Helper functions and deprecations

- `getParamResolver(input: ParamResolverInput)`  
  Normalizes either a static descriptor or a `ParamResolver` instance into a resolver instance.

- `createResolver(input: ParamResolverInput)`  
  Returns `ParamResolver.toResolverFunction()` for quick inline usage. This is kept for backwards compatibility and may be deprecated in favor of constructing `new ParamResolver(input)` directly.

- `ApiFromResolver(input: ParamResolverInput, extras?: ApiHeaderOptions | ApiQueryOptions)`  
  Convenience helper to generate Swagger decorators from resolver inputs.

### ApiInject: Making API Contracts Explicit via Dependency Injection

In real-world Nest.js applications, many API contracts are *implicit* rather than declared directly on controllers.

Common examples include:

- Authentication tokens read from headers
- Tenant or locale identifiers propagated through services
- Feature flags or internal routing hints extracted from requests

These values are often accessed deep inside services, guards, or interceptors—far away from the controller layer where API documentation (Swagger) is usually defined.

This creates a long-standing tension:

- **Dependency Injection (DI)** knows what a controller *depends on*
- **Swagger decorators** describe what an API *expects from the client*
- But the two are traditionally maintained **separately and manually**

`@ApiInject()` exists to bridge this gap.

---

#### What `@ApiInject()` Does

`@ApiInject()` is an explicit opt-in decorator that behaves like `@Inject()`, but additionally allows Nesties to **infer API contract metadata from the dependency graph** and attach the corresponding Swagger documentation automatically.

In other words:

> If a controller explicitly injects something that depends on request parameters,  
> then those parameters are part of the API contract and should be documented.

---

#### Why This Is Explicit (Not Magic)

A key design principle of Nesties is that **API contracts should never be inferred silently**.

`@ApiInject()` is intentionally *not* a drop-in replacement for `@Inject()`.

By choosing to write:

```ts
@ApiInject()
private readonly articleService: ArticleService;
```

you are explicitly stating:

> “This dependency participates in the public API contract of this controller.”

Only dependencies injected via `@ApiInject()` are eligible for automatic Swagger inference.
Regular `@Inject()` remains side-effect free.

This makes the behavior:
- Predictable
- Auditable
- Easy to reason about in code review

---

#### How Swagger Metadata Is Inferred

`@ApiInject()` works in combination with `ParamResolver` and request-scoped providers.

At a high level:

1. `ParamResolver` declares **how** a value is resolved from a request (header, query, or dynamic logic)
2. `toRequestScopedProvider()` turns that resolver into an injectable token
3. Services depend on those tokens through standard Nest.js DI
4. `@ApiInject()` walks the dependency graph starting from the injected token
5. Any Swagger metadata declared by resolvers is automatically applied to the controller

This ensures that:

- Swagger documentation reflects *actual runtime requirements*
- API headers and query parameters are documented once, at their source
- Changes to resolver logic propagate consistently across all consumers

---

#### Example: Documenting Headers via Dependency Injection

```ts
const userTokenResolver = new ParamResolver({
    paramType: 'header',
    paramName: 'x-user-token',
});

const userTokenProvider = userTokenResolver.toRequestScopedProvider();

@Injectable()
class ArticleService {
    constructor(
        @userTokenProvider.inject()
        private readonly userToken: string | undefined,
    ) {}
}

@Controller('articles')
export class ArticleController {
    constructor(
        @ApiInject()
        private readonly articleService: ArticleService,
    ) {}
    
    @Get()
    list() {
        // ...
    }
}
```

In this example:

- `ArticleService` depends on `x-user-token`
- The controller explicitly opts into API inference via `@ApiInject()`
- `x-user-token` is automatically documented in Swagger
- No manual `@ApiHeader()` is required on the controller

---

#### Design Philosophy

`@ApiInject()` is based on a simple idea:

> **Dependency Injection already encodes API contracts — we should not ignore that information.**

Rather than duplicating knowledge across:
- controllers (Swagger decorators)
- services (request access logic)
- guards and interceptors

Nesties treats DI as the single source of truth and lets Swagger documentation follow from it.

This approach improves:
- Consistency between implementation and documentation
- Maintainability in large codebases
- Confidence that documented APIs match actual runtime behavior

---

#### When to Use (and Not Use) `@ApiInject()`

Use `@ApiInject()` when:
- A dependency influences how requests are interpreted
- A resolver reads from headers or query parameters
- The dependency represents part of the public API contract

Avoid `@ApiInject()` when:
- The dependency is purely internal
- It does not depend on request data
- You do not want it reflected in Swagger documentation

Keeping this distinction explicit is what allows Nesties to scale safely in large teams.


### 10. DTO Classes

- **BlankReturnMessageDto**: A basic DTO for standardized API responses.
- **BlankPaginatedReturnMessageDto**: A DTO for paginated API responses.
- **GenericReturnMessageDto**: A generic DTO for returning data of any type.
- **StringReturnMessageDto**: A simple DTO for string responses.

```ts
import { StringReturnMessageDto } from 'nesties';

const response = new StringReturnMessageDto(
  200,
  'Success',
  'This is a string response',
);
```

## Configuration

The `TokenGuard` class uses the `ConfigService` from `@nestjs/config` to access configuration values, such as the `SERVER_TOKEN`. Make sure you have `@nestjs/config` installed and configured in your Nest.js project.

```ts
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
})
export class AppModule {}
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request or report issues.

## License

Nesties is MIT licensed.
