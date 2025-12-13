import { AnyClass, createMutateInject } from './utility';
import { swaggerInjectionCollector } from './utility/swagger-injection-collector';

const clsUsedMap = new WeakMap<AnyClass, Set<string>>();

export const ApiInject = createMutateInject((token, cls) => {
  const swaggers = swaggerInjectionCollector(token);
  if (!swaggers.length) return token;

  let usedSet = clsUsedMap.get(cls);
  if (!usedSet) {
    usedSet = new Set<string>();
    clsUsedMap.set(cls, usedSet);
  }

  for (const swagger of swaggers) {
    if (usedSet.has(swagger.token)) {
      continue;
    }
    usedSet.add(swagger.token);

    swagger.swagger()(cls);
  }

  return token;
});
