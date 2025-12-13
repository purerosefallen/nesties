import { ApiHeaderOptions, ApiQueryOptions } from '@nestjs/swagger';

export interface ParamResolverSwaggerInfo {
  swagger: (
    extras?: ApiHeaderOptions | ApiQueryOptions,
  ) => ClassDecorator & MethodDecorator;
  token: string;
}
