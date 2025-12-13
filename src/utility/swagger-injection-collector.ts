import { createCollectorFromInjectionToken } from './collect-info-from-injection-token';
import { ResolverSwaggerMap } from './resolver-swagger-map';

export const swaggerInjectionCollector =
  createCollectorFromInjectionToken(ResolverSwaggerMap);
