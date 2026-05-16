import { ParamResolverSwaggerInfo } from './param-resolver-swagger-info.type';
import type { InjectionToken } from '@nestjs/common';

export const ResolverSwaggerMap = new Map<
  InjectionToken,
  ParamResolverSwaggerInfo[]
>();
