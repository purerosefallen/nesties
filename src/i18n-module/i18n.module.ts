import { Global, Module } from '@nestjs/common';
import {
  I18nModuleBase,
  I18nModuleOptionsToken,
  I18nResolverToken,
} from './i18n-token';
import { createProvider } from '../create-provider';
import { createDynamicResolverFromStatic } from './i18n-resolver';
import { I18nService } from './i18n.service';
import { I18nModuleOptions } from './i18n-module.options';
import { LocalePipe } from './locale.pipe';

@Global()
@Module({
  providers: [
    createProvider(
      {
        provide: I18nResolverToken,
        inject: [I18nModuleOptionsToken],
      },
      (o: I18nModuleOptions) => createDynamicResolverFromStatic(o.resolver),
    ),
    I18nService,
    LocalePipe,
  ],
  exports: [I18nService, LocalePipe],
})
export class I18nModule extends I18nModuleBase {}
