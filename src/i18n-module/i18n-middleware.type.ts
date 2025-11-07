import { ExecutionContext } from '@nestjs/common';
import { Awaitable } from '../utility/awaitable';

export type I18nMiddleware = (
  locale: string,
  text: string,
  next: () => Promise<string | undefined>,
  ctx?: ExecutionContext,
) => Awaitable<string | undefined>;
