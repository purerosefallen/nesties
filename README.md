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

## Usage

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

Nesties includes a `TokenGuard` class that validates server tokens from the request headers. This can be used with the `RequireToken` decorator for routes requiring token validation.

```typescript
import { RequireToken } from 'nesties';

@Controller('secure')
export class SecureController {
@Get()
@RequireToken()
secureEndpoint() {
// This endpoint requires a token
}
}
```

#### How to Use `TokenGuard`

1. **Set the `SERVER_TOKEN` in the Configuration**

   In your Nest.js configuration, make sure to set up the `SERVER_TOKEN` using the `@nestjs/config` package.

   ```typescript
   import { ConfigModule } from '@nestjs/config';

   @Module({
      imports: [ConfigModule.forRoot()],
   })
   export class AppModule {}
   ```

   In your environment file (`.env`), define your token:

   ```
   SERVER_TOKEN=your-secure-token
   ```

2. **Token Validation with `TokenGuard`**

   `TokenGuard` checks the request headers for a token called `x-server-token`. If this token matches the one defined in your configuration, the request is allowed to proceed. If the token is missing or incorrect, a `401 Unauthorized` error is thrown.

   This approach is ideal for simple token-based authentication for APIs. It provides a lightweight method to protect routes without implementing a full OAuth or JWT-based system.

3. **Use `RequireToken` Decorator**

   Apply the `RequireToken` decorator to your controller methods to enforce token validation:

   ```typescript
   import { Controller, Get } from '@nestjs/common';
   import { RequireToken } from 'nesties';

   @Controller('api')
   export class ApiController {
   @Get('protected')
   @RequireToken()
   protectedRoute() {
   return { message: 'This is a protected route' };
   }
   }
   ```

   In this example, the `protectedRoute` method will only be accessible if the request includes the correct `x-server-token` header.

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
