import { AnyClass } from './class-types';
import { Metadata, reflector } from '../metadata';

export const ApplyDecoratorUnique = <
  D extends
    | ClassDecorator
    | MethodDecorator
    | PropertyDecorator
    | ParameterDecorator,
>(
  dec: D,
  identifier: any,
): D =>
  ((...args: Parameters<D>) => {
    const isClassRelated = args.length === 1 || args[1] === undefined; // class decorator or constructor parameter decorator
    const target = args[0] as any;
    const cls: AnyClass =
      typeof target === 'function' ? target : target.constructor;
    if (isClassRelated) {
      const used = reflector.getArray('usedUniqueDecoratorIdentifiers', cls);
      if (used.includes(identifier)) {
        return;
      }
      Metadata.appendUnique('usedUniqueDecoratorIdentifiers', identifier)(cls);
      return (dec as any)(...args) as ReturnType<D>;
    } else {
      const keyName = args[1];
      const used = reflector.getProperty(
        'usedUniqueDecoratorIdentifiers',
        cls as any,
        keyName,
      );
      if (used.includes(identifier)) {
        return;
      }
      Metadata.appendUnique('usedUniqueDecoratorIdentifiers', identifier)(
        cls as any,
        keyName,
      );
      return (dec as any)(...args) as ReturnType<D>;
    }
  }) as D;
