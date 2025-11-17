import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { AnyClass } from 'nesties';
import { ApiPropertyOptions } from '@nestjs/swagger';

export const getApiProperty = (
  cls: AnyClass,
  key: string,
): ApiPropertyOptions => {
  return (
    Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, cls.prototype, key) ||
    {}
  );
};
