import { ExecutionContext } from '@nestjs/common';
import { I18nMiddleware } from 'nfkit';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace I18nNesties {
  export type Ex = [ctx?: ExecutionContext];
  export type Middleware = I18nMiddleware<Ex>;
}
