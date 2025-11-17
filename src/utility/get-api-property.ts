import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { ApiPropertyOptions } from '@nestjs/swagger';
import { AnyClass } from './class-types';

export const getApiProperty = (
  cls: AnyClass,
  key: string,
): ApiPropertyOptions => {
  let proto = cls.prototype;

  while (proto && proto !== Object.prototype) {
    const meta = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES,
      proto,
      key,
    );

    if (meta) return meta;

    proto = Object.getPrototypeOf(proto);
  }

  return {};
};
