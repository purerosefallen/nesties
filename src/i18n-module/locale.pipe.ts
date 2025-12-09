import {
  ArgumentMetadata,
  createParamDecorator,
  ExecutionContext,
  Inject,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { I18nService } from './i18n.service';
import { createResolver, ParamResolverInput } from '../resolver';
import { ModuleRef } from '@nestjs/core';

type LocaleContext = {
  ctx: ExecutionContext;
  resolver?: ParamResolverInput;
};

@Injectable()
export class LocalePipe implements PipeTransform {
  constructor(
    @Inject(I18nService) private i18nService: I18nService,
    @Inject(ModuleRef) private moduleRef: ModuleRef,
  ) {}

  async transform(ctx: LocaleContext, metadata: ArgumentMetadata) {
    const resolver = ctx.resolver;
    if (resolver) {
      const _resolver = createResolver(resolver);
      const req = ctx.ctx.switchToHttp().getRequest();
      const locale = await _resolver(req, this.moduleRef);
      return this.i18nService.getExactLocale(locale);
    } else {
      return this.i18nService.getExactLocaleFromRequest(ctx.ctx);
    }
  }
}

const _dec = createParamDecorator(
  (resolver: ParamResolverInput | undefined, ctx) => {
    return { ctx, resolver };
  },
);

export const PutLocale = (resolver?: ParamResolverInput) =>
  _dec(resolver, LocalePipe);
