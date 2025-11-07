import {
  ArgumentMetadata,
  createParamDecorator,
  ExecutionContext,
  Inject,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { I18nService } from './i18n.service';
import { I18nResolver } from './i18n-module.options';
import { createDynamicResolverFromStatic } from './i18n-resolver';

type LocaleContext = {
  ctx: ExecutionContext;
  resolver?: I18nResolver;
};

@Injectable()
export class LocalePipe implements PipeTransform {
  constructor(@Inject(I18nService) private i18nService: I18nService) {}

  async transform(ctx: LocaleContext, metadata: ArgumentMetadata) {
    const resolver = ctx.resolver;
    if (resolver) {
      const _resolver = createDynamicResolverFromStatic(resolver);
      const locale = await _resolver(ctx.ctx, undefined);
      return this.i18nService.getExactLocale(locale);
    } else {
      return this.i18nService.getExactLocaleFromRequest(ctx.ctx);
    }
  }
}

const _dec = createParamDecorator((resolver: I18nResolver | undefined, ctx) => {
  return { ctx, resolver };
});

export const PutLocale = (resolver?: I18nResolver) =>
  _dec(resolver, LocalePipe);
