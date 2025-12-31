import { Awaitable } from 'nfkit';
import { AnyReq, ParamResolverBase, TransformParamResolver } from './resolver';
import { ModuleRef } from '@nestjs/core';
import { parseBool } from '../utility';

export const createLambdaParamResolver =
  <T, U, Req extends AnyReq = AnyReq>(
    cb: (param: T, ref: ModuleRef, req: Req) => Awaitable<U>,
  ) =>
  (resolver: ParamResolverBase<T>) =>
    new TransformParamResolver<T, U, Req>(resolver, cb);

export const ParseIntParamResolver = createLambdaParamResolver((s: string) =>
  parseInt(s, 10),
);
export const ParseFloatParamResolver = createLambdaParamResolver((s: string) =>
  parseFloat(s),
);
export const ParseBoolParamResolver = createLambdaParamResolver(parseBool);
export const ParseDateParamResolver = createLambdaParamResolver(
  (s: number | string | Date) => new Date(s),
);
export const ParseBase64ParamResolver = createLambdaParamResolver(
  (s: string) => {
    // support base64 or base64url
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4 !== 0) {
      s += '=';
    }
    return Buffer.from(s, 'base64');
  },
);
export const DefaultValueParamResolver = <T>(
  r: ParamResolverBase<T>,
  defaultValue: T,
) =>
  createLambdaParamResolver<T, T>((value: T) =>
    value === undefined || value === null ? defaultValue : value,
  )(r);
