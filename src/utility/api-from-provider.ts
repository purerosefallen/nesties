import { InjectionToken } from '@nestjs/common';
import { swaggerInjectionCollector } from './swagger-injection-collector';
import { ApplyDecoratorUnique } from './apply-decorator-unique';

export const ApiFromProvider =
  (token: InjectionToken): ClassDecorator =>
  (cls) => {
    const swaggers = swaggerInjectionCollector(token);

    for (const swagger of swaggers) {
      ApplyDecoratorUnique(swagger.swagger(), swagger.token)(cls);
    }
  };
