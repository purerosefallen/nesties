import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { from, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { I18nService } from './i18n.service';

@Injectable()
export class I18nInterceptor implements NestInterceptor {
  constructor(@Inject(I18nService) private readonly i18nService: I18nService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      // 成功路径：把响应体交给 i18n 做异步翻译
      mergeMap((data) => this.i18nService.translateRequest(context, data)),
      // 错误路径：若是 HttpException，把其 response 翻译后再抛
      catchError((err) => {
        if (err instanceof HttpException) {
          const status = err.getStatus();
          const resp = err.getResponse();
          return from(this.i18nService.translateRequest(context, resp)).pipe(
            mergeMap((translated) =>
              throwError(
                () => new HttpException(translated, status, { cause: err }),
              ),
            ),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
