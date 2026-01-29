import { Awaitable } from 'nfkit';
import { AnyReq, ParamResolverBase, TransformParamResolver } from './resolver';
import { ModuleRef } from '@nestjs/core';
import { parseBool } from '../utility';
import { BlankReturnMessageDto } from '../return-message';

export const createLambdaParamResolver =
  <T, U, Req extends AnyReq = AnyReq>(
    cb: (param: T, ref: ModuleRef, req: Req) => Awaitable<U>,
  ) =>
  (resolver: ParamResolverBase<T>) =>
    new TransformParamResolver<T, U, Req>(resolver, cb);

export const ParseIntParamResolver = createLambdaParamResolver((s: string) => {
  if (s == null) {
    return s as unknown as number;
  }
  const res = parseInt(s, 10);
  if (isNaN(res)) {
    throw new BlankReturnMessageDto(
      400,
      'Invalid integer parameter',
    ).toException();
  }
  return res;
});
export const ParseFloatParamResolver = createLambdaParamResolver(
  (s: string) => {
    if (s == null) {
      return s as unknown as number;
    }
    const res = parseFloat(s);
    if (isNaN(res)) {
      throw new BlankReturnMessageDto(
        400,
        'Invalid float parameter',
      ).toException();
    }
    return res;
  },
);
export const ParseBoolParamResolver = createLambdaParamResolver(parseBool);
export const ParseDateParamResolver = createLambdaParamResolver(
  (s: number | string | Date) => {
    if (s == null) {
      return s as unknown as Date;
    }
    const res = new Date(s);
    // check invalid date
    if (isNaN(res.getTime())) {
      throw new BlankReturnMessageDto(
        400,
        'Invalid date parameter',
      ).toException();
    }
    return res;
  },
);
export const ParseBase64ParamResolver = createLambdaParamResolver(
  (s: string) => {
    if (s == null) {
      return s as unknown as Buffer;
    }
    // support base64 or base64url
    const normalized = s.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

    // 字符集合校验（base64 的合法字符 + padding）
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(padded)) {
      throw new BlankReturnMessageDto(
        400,
        'Invalid base64 parameter',
      ).toException();
    }

    const buf = Buffer.from(padded, 'base64');

    // round-trip 校验：编码回去（去 padding）要一致（容忍 url/base64 差异的话用 normalized 对比）
    const re = buf.toString('base64').replace(/=+$/g, '');
    const in0 = padded.replace(/=+$/g, '');
    if (re !== in0) {
      throw new BlankReturnMessageDto(
        400,
        'Invalid base64 parameter',
      ).toException();
    }

    return buf;
  },
);
export const DefaultValueParamResolver = <T>(
  r: ParamResolverBase<T>,
  defaultValue: T,
) =>
  createLambdaParamResolver<T, T>((value: T) =>
    value === undefined || value === null ? defaultValue : value,
  )(r);
