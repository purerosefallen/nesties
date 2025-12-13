import { FactoryProvider } from '@nestjs/common';
import { InjectionToken } from '@nestjs/common/interfaces/modules/injection-token.interface';
import { InjectionTokenMap } from './utility/injection-token-map';

type TypeFromToken<T> = T extends string | symbol
  ? any
  : T extends InjectionToken<infer U>
    ? U
    : any;

type TokensToTypes<A extends InjectionToken[]> = A extends []
  ? []
  : A extends [infer F, ...infer R]
    ? [TypeFromToken<F>, ...TokensToTypes<R extends InjectionToken[] ? R : []>]
    : [];

type Awaitable<T> = T | Promise<T>;

export interface TypedFactoryProvider<A extends InjectionToken[], R>
  extends FactoryProvider<R> {
  inject: A;
  useFactory: (...args: TokensToTypes<A>) => Awaitable<R>;
}

export const createProvider = <const A extends InjectionToken[], R>(
  options: { inject: A } & Omit<FactoryProvider<R>, 'inject' | 'useFactory'>,
  factory: (...args: TokensToTypes<A>) => Awaitable<R>,
): TypedFactoryProvider<A, R> => {
  if (options.inject) {
    InjectionTokenMap.set(options.provide, options.inject);
  }
  return {
    useFactory: factory,
    ...options,
  };
};
