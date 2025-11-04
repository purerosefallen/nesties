import { Observable, takeUntil } from 'rxjs';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IncomingMessage } from 'node:http';
import { BlankReturnMessageDto } from './return-message';
import type { Request, Response } from 'express';
import { createAbortSignalFromHttp } from './abort-http-signal';

export type AbortableFn<T> = (ac: AbortController) => Promise<T>;

export const fromAbortable = <T>(fn: AbortableFn<T>): Observable<T> => {
  return new Observable<T>((subscriber) => {
    const ac = new AbortController();

    fn(ac).then(
      (value) => {
        if (!ac.signal.aborted && !subscriber.closed) {
          subscriber.next(value);
          subscriber.complete();
        }
      },
      (err) => {
        if (ac.signal.aborted) {
          if (!subscriber.closed) subscriber.complete();
          return;
        }
        if (!subscriber.closed) subscriber.error(err);
      },
    );

    return () => {
      if (!ac.signal.aborted) ac.abort();
    };
  });
};

export const takeUntilAbort = <T>(signal: AbortSignal) => {
  return (source: Observable<T>) => {
    return source.pipe(
      takeUntil(
        new Observable<void>((subscriber) => {
          const onAbort = () => subscriber.next();
          if (signal.aborted) {
            subscriber.next();
          } else {
            signal.addEventListener('abort', onAbort, { once: true });
          }
          return () => signal.removeEventListener('abort', onAbort);
        }),
      ),
    );
  };
};

export const As = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return createAbortSignalFromHttp(req);
  },
);
