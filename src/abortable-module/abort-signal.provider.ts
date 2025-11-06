import { Inject, Scope, Type } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { createAbortSignalFromHttp } from '../abort-http-signal';
import { createProvider } from '../create-provider';

export const ABORT_SIGNAL = Symbol(
  'ABORT_SIGNAL',
) as unknown as Type<AbortSignal>;
export const AbortSignalProvider = createProvider(
  {
    provide: ABORT_SIGNAL,
    scope: Scope.REQUEST,
    inject: [REQUEST],
  },
  createAbortSignalFromHttp,
);

export const InjectAbortSignal = () => Inject(ABORT_SIGNAL);
