# Nesties

**Nest.js utilities**

Nesties is a utility library for Nest.js applications, designed to simplify and enhance common patterns such as decorators, response structures, and request validation. This library provides a set of utilities to streamline your development workflow and improve code reuse and clarity when working with Nest.js.

## Features

- **Decorator Merging**: Merge multiple property, method, class, and parameter decorators.
- **Predefined API Responses**: Simplified and consistent response structures for APIs.
- **Data Validation Pipes**: Validation pipe utilities to handle query and body validation effortlessly.
- **Custom Guards**: Easily implement token-based guards and API header validation.
- **Pagination and Return DTOs**: DTOs for standard and paginated API responses.

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

```typescript
import { MergePropertyDecorators } from 'nesties';

const CombinedPropertyDecorator = MergePropertyDecorators([Decorator1, Decorator2]);
```

- **Method Decorator**

```typescript
import { MergeMethodDecorators } from 'nesties';

const CombinedMethodDecorator = MergeMethodDecorators([Decorator1, Decorator2]);
```

- **Class Decorator**

```typescript
import { MergeClassDecorators } from 'nesties';

const CombinedClassDecorator = MergeClassDecorators([Decorator1, Decorator2]);
```

- **Parameter Decorator**

```typescript
import { MergeParameterDecorators } from 'nesties';

const CombinedParameterDecorator = MergeParameterDecorators([Decorator1, Decorator2]);
```

### 2. API Response Decorators

Nesties includes a utility for defining API error responses conveniently.

```typescript
import { ApiError } from 'nesties';

@ApiError(401, 'Unauthorized access')
```

### 3. Validation Pipes

Nesties provides utilities for creating validation pipes with automatic data transformation and validation.

- **Data Pipe**

```typescript
import { DataPipe } from 'nesties';

const validationPipe = DataPipe();
```

- **Decorators for Request Validation**

```typescript
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

```typescript
import { BlankReturnMessageDto, GenericReturnMessageDto, PaginatedReturnMessageDto, ReturnMessageDto } from 'nesties';

const response = new GenericReturnMessageDto(200, 'Operation successful', myData);
```

#### Example Usage of `ReturnMessageDto`

`ReturnMessageDto` allows you to generate a DTO dynamically based on the structure of a provided class. This is useful when you want to create a standardized response that includes custom data types.

Suppose we have a `User` class:

```typescript
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

```typescript
import { ReturnMessageDto } from 'nesties';

class UserReturnMessageDto extends ReturnMessageDto(User) {}

const response = new UserReturnMessageDto(200, 'Success', { id: 1, name: 'John Doe', email: 'john.doe@example.com' });
```

This approach automatically creates a DTO structure with the properties of `User` integrated as the data field, ensuring consistency and reusability in your API responses.


```

### 5. Token Guard

`TokenGuard` validates a single “server token” before invoking a controller method. By default it reads `SERVER_TOKEN` from `ConfigService` and compares it with the `x-server-token` header, returning a `401` when they differ.

#### Quick start (defaults only)

1. **Load the config module**

   ```typescript
   import { ConfigModule } from '@nestjs/config';

   @Module({
     imports: [ConfigModule.forRoot()],
   })
   export class AppModule {}
   ```

2. **Set the secret**

   ```
   SERVER_TOKEN=your-secure-token
   ```

3. **Decorate the route**

   ```typescript
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

- `resolver` (default: `{ paramType: 'header', paramName: 'x-server-token' }`): where to read the **client** token from. Accepts any `ResolverDual`, so query/header resolvers are all supported.
- `tokenSource` (default: `'SERVER_TOKEN'`): how to read the **server** token. Provide another config key or an async resolver `(ctx, moduleRef) => Promise<string>` for dynamic sources.
- `errorCode` (default: `401`): HTTP status when tokens do not match.

```typescript
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

Multi-tenant secrets are just another `tokenSource` resolver:

```typescript
import { ConfigService } from '@nestjs/config';
import { createResolver } from 'nesties';

const headerResolver = { paramType: 'header', paramName: 'x-tenant-token' };

@RequireToken({
  resolver: headerResolver,
  tokenSource: async (ctx, moduleRef) => {
    const tenantId = await createResolver({
      paramType: 'header',
      paramName: 'x-tenant-id',
    })(ctx, moduleRef);
    const config = moduleRef.get(ConfigService);
    return config.get<string>(`TENANT_${tenantId}_TOKEN`);
  },
})
```

`TokenGuard` only throws when both values exist and differ, so clearing the config value temporarily disables the guard without a code change.

### 6. AbortableModule

Use `AbortableModule` when you want long‑running providers to respect the lifetime of the HTTP request. The module exposes a request‑scoped `AbortSignal` and wraps existing providers with [`nfkit`](https://www.npmjs.com/package/nfkit)'s `abortable` helper so that work can be canceled automatically when the client disconnects.

```typescript
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

```typescript
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

The wrapped `HttpService` observes the same abort signal as the request, so in‑flight HTTP calls will be canceled as soon as the client disconnects or Nest aborts the request scope.

### 7. I18nModule

Nesties also ships an opinionated but flexible internationalization module. The typical workflow is to call `createI18n` to obtain `I18nModule` plus the `UseI18n` decorator, register locale lookup middleware (e.g., `I18nLookupMiddleware`), and then return DTOs that contain placeholders like `#{key}`—the interceptor installed by `@UseI18n()` will translate those placeholders automatically before the response leaves the server.

```typescript
import {
  createI18n,
  I18nService,
  GenericReturnMessageDto,
  I18nLookupMiddleware,
} from 'nesties';

const { I18nModule, UseI18n } = createI18n({
  locales: ['en-US', 'zh-CN'],
  defaultLocale: 'en-US',
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

#### `@PutLocale()` Per-handler Overrides

`@PutLocale()` lets you override how the locale is resolved for a specific handler or parameter. Pass a custom resolver (any shape supported by `ResolverDual`) when you want to read the locale from a query param, body field, or even headers different from the global resolver.

```typescript
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

#### Custom Middleware with TypeORM

You can register any number of middlewares that resolve placeholders. The example below queries a TypeORM repository to fetch translations stored in a database and falls back to the next middleware when no record is found.

```typescript
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
```

- `createI18n` returns both a configured module (`I18nModule`) and a decorator (`UseI18n`) that adds the bundled interceptor and Swagger metadata describing the locale resolver.
- `UseI18n` wires the interceptor that walks the returned DTO (e.g., `GenericReturnMessageDto`) and replaces every string that contains placeholders (`Hello #{key}`) using the locale detected from the incoming request.
- `I18nService.middleware` lets you register middlewares such as `I18nLookupMiddleware` for dictionary lookups, database resolvers, or remote translation APIs.
- `LocalePipe`/`PutLocale` provide ergonomic access to the resolved locale inside route handlers, and you can override the resolver per parameter when necessary.
- `I18nService.translate` and `translateString` remain available for advanced manual flows (generating strings outside of interceptor scope, building static assets, etc.).

## DTO Classes

- **BlankReturnMessageDto**: A basic DTO for standardized API responses.
- **BlankPaginatedReturnMessageDto**: A DTO for paginated API responses.
- **GenericReturnMessageDto**: A generic DTO for returning data of any type.
- **StringReturnMessageDto**: A simple DTO for string responses.

```typescript
import { StringReturnMessageDto } from 'nesties';

const response = new StringReturnMessageDto(200, 'Success', 'This is a string response');
```

## Configuration

The `TokenGuard` class uses the `ConfigService` from `@nestjs/config` to access configuration values, such as the `SERVER_TOKEN`. Make sure you have `@nestjs/config` installed and configured in your Nest.js project.

```typescript
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
