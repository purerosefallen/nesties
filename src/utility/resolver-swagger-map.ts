import { ParamResolverSwaggerInfo } from './param-resolver-swagger-info.type';
import { InjectionToken } from '@nestjs/common/interfaces/modules/injection-token.interface';

export const ResolverSwaggerMap = new Map<
  InjectionToken,
  ParamResolverSwaggerInfo[]
>();
