import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import { RenameClass } from './utility';
import {
  AnyClass,
  ClassOrArray,
  ParamsFromClass,
  ParseType,
  TypeFromClass,
} from './utility';

export interface InsertOptions<C extends ClassOrArray = ClassOrArray> {
  type: C;
  options?: ApiPropertyOptions;
}

type TypeFromInsertOptions<O extends InsertOptions> =
  O extends InsertOptions<infer C>
    ?
        | ParseType<C>
        | (O extends { options: { required: true } } ? never : undefined)
    : never;

type Merge<T, U> = {
  [K in keyof T | keyof U]: K extends keyof T
    ? T[K]
    : K extends keyof U
      ? U[K]
      : never;
};

export function InsertField<
  C extends AnyClass,
  M extends Record<string, InsertOptions>,
>(
  cl: C,
  map: M,
  newName?: string,
): new (...args: ParamsFromClass<C>) => Merge<
  {
    [F in keyof M]: TypeFromInsertOptions<M[F]>;
  },
  TypeFromClass<C>
> {
  const extendedCl = class extends cl {};
  for (const key in map) {
    ApiProperty({
      type: map[key].type,
      ...(map[key].options || {}),
    })(extendedCl.prototype, key);
  }
  return RenameClass(extendedCl, newName || cl.name);
}
