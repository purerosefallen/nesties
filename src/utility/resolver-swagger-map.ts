import { ParamResolverSwaggerInfo } from './param-resolver-swagger-info.type';
import { InjectionToken } from '@nestjs/common';

export const ResolverSwaggerMap = new Map<
  InjectionToken,
  ParamResolverSwaggerInfo[]
>();
