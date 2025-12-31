import {
  ConsoleLogger,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { I18nModuleOptionsToken } from './i18n-token';
import { I18nModuleOptions } from './i18n-module.options';
import { ModuleRef } from '@nestjs/core';
import { ParamResolverBase } from '../resolver';
import { I18n } from 'nfkit';
import { I18nNesties } from './i18n.types';
import { I18nParamResolverToken } from './i18n-param-resolver.token';

@Injectable()
export class I18nService extends I18n<I18nNesties.Ex> {
  constructor(
    @Inject(I18nModuleOptionsToken)
    private i18nServiceOptions: I18nModuleOptions,
    @Inject(ModuleRef) private moduleRef: ModuleRef,
    @Inject(I18nParamResolverToken) private resolver: ParamResolverBase<string>,
  ) {
    super(i18nServiceOptions);
  }

  private _shadowMiddlewareMap = new Map<
    I18nNesties.Middleware,
    I18nNesties.Middleware
  >();

  private logger = new ConsoleLogger('I18nService');

  middleware(mw: I18nNesties.Middleware, prior = false) {
    const wrappedMw: I18nNesties.Middleware = async (
      locale,
      text,
      next,
      ctx,
    ) => {
      try {
        return await mw(locale, text, next, ctx);
      } catch (e) {
        if (e instanceof HttpException) {
          throw e;
        }
        this.logger.error(`Error in i18n middleware: ${e.message}`);
        return next();
      }
    };
    this._shadowMiddlewareMap.set(mw, wrappedMw);
    return super.middleware(wrappedMw, prior);
  }

  removeMiddleware(mw: I18nNesties.Middleware) {
    const wrappedMw = this._shadowMiddlewareMap.get(mw);
    if (wrappedMw) {
      this._shadowMiddlewareMap.delete(mw);
      return super.removeMiddleware(wrappedMw);
    }
    return this;
  }

  async getExactLocaleFromRequest(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const locale = await this.resolver.resolve(req, this.moduleRef);
    return this.getExactLocale(locale);
  }

  async translateRequest(ctx: ExecutionContext, obj: any): Promise<any> {
    const req = ctx.switchToHttp().getRequest();
    const locale = await this.resolver.resolve(req, this.moduleRef);
    return this.translate(locale, obj, ctx);
  }
}
