import {
  Body,
  PipeTransform,
  Query,
  Type,
  ValidationPipe,
} from '@nestjs/common';

export const DataPipe = () =>
  new ValidationPipe({
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });

const createDataPipeDec =
  (
    nestFieldDec: (
      ...pipes: (Type<PipeTransform> | PipeTransform)[]
    ) => ParameterDecorator,
  ) =>
  (...extraPipes: (Type<PipeTransform> | PipeTransform)[]) =>
    nestFieldDec(DataPipe(), ...extraPipes);

export const DataQuery = createDataPipeDec(Query);
export const DataBody = createDataPipeDec(Body);
