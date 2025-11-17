import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { ApiPropertyOptions } from '@nestjs/swagger';
import { AnyClass } from './class-types';

export const getApiProperty = (
  cls: AnyClass,
  key: string,
): ApiPropertyOptions => {
  return (
    Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, cls.prototype, key) ||
    {}
  );
};
