import { InjectionToken } from '@nestjs/common/interfaces/modules/injection-token.interface';
import { Inject } from '@nestjs/common';
import { AnyClass } from './class-types';

export type InjectPos =
  | { type: 'param'; index: number }
  | { type: 'property'; propertyKey: string | symbol };

export const createMutateInject =
  (
    tokenResolver: (
      t: InjectionToken,
      cls: AnyClass,
      pos: InjectPos,
    ) => InjectionToken,
  ) =>
  (token?: InjectionToken): ParameterDecorator & PropertyDecorator =>
  (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number,
  ) => {
    const cls: AnyClass =
      typeof target === 'function'
        ? (target as AnyClass)
        : (target.constructor as AnyClass);

    let actualToken = token;

    if (!actualToken) {
      if (parameterIndex != null) {
        // parameter decorator (ctor or method)
        const paramTypes: any[] =
          propertyKey == null
            ? Reflect.getMetadata('design:paramtypes', target) || []
            : Reflect.getMetadata('design:paramtypes', target, propertyKey) ||
              [];
        actualToken = paramTypes[parameterIndex];
      } else {
        // property decorator
        actualToken = Reflect.getMetadata('design:type', target, propertyKey!);
      }

      if (!actualToken) {
        const where =
          parameterIndex != null
            ? `${String(propertyKey ?? 'constructor')}[${parameterIndex}]`
            : String(propertyKey);
        throw new Error(
          `Cannot infer type from metadata: ${cls?.name ?? 'UnknownClass'}.${where}`,
        );
      }
    }

    const pos: InjectPos =
      parameterIndex != null
        ? { type: 'param', index: parameterIndex }
        : { type: 'property', propertyKey: propertyKey! };

    Inject(tokenResolver(actualToken, cls, pos))(
      target,
      propertyKey as any,
      parameterIndex as any,
    );
  };
