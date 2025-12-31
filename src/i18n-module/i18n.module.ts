import { Global, Module } from '@nestjs/common';
import { I18nModuleBase, I18nModuleOptionsToken } from './i18n-token';
import { I18nService } from './i18n.service';
import { LocalePipe } from './locale.pipe';
import { LocaleContext } from './locale.context';
import { createProvider } from '../create-provider';
import { I18nParamResolverToken } from './i18n-param-resolver.token';
import { I18nModuleOptions } from './i18n-module.options';
import { getParamResolver } from '../resolver';

const providerFromOptions = createProvider(
  {
    provide: I18nParamResolverToken,
    inject: [I18nModuleOptionsToken],
  },
  (options: I18nModuleOptions) =>
    getParamResolver(
      options.resolver || {
        paramType: 'header',
        paramName: 'x-client-language',
      },
    ),
);

@Global()
@Module({
  providers: [I18nService, LocalePipe, providerFromOptions],
  exports: [I18nService, LocalePipe],
})
export class I18nModule extends I18nModuleBase {
  static forRoot(options: I18nModuleOptions) {}
}
