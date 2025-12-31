import { createMutateInject } from '../utility';
import { swaggerInjectionCollector } from '../utility/swagger-injection-collector';
import { ApplyDecoratorUnique } from '../utility/apply-decorator-unique';

export const ApiInject = createMutateInject((token, cls) => {
  const swaggers = swaggerInjectionCollector(token);

  for (const swagger of swaggers) {
    ApplyDecoratorUnique(swagger.swagger(), swagger.token)(cls);
  }

  return token;
});
