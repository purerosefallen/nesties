import { Inject, Provider, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request as ExpressReq } from 'express';
import { createAbortSignalFromHttp } from '../abort-http-signal';

export const ABORT_SIGNAL = Symbol('ABORT_SIGNAL');
export const AbortSignalProvider: Provider = {
  provide: ABORT_SIGNAL,
  scope: Scope.REQUEST,
  inject: [REQUEST],
  useFactory: (req: ExpressReq) => {
    return createAbortSignalFromHttp(req);
  },
};

export const InjectAbortSignal = () => Inject(ABORT_SIGNAL);
