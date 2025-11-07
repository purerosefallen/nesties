import { Global, Module } from '@nestjs/common';
import { I18nModuleBase } from './i18n-token';
import { I18nService } from './i18n.service';
import { LocalePipe } from './locale.pipe';

@Global()
@Module({
  providers: [I18nService, LocalePipe],
  exports: [I18nService, LocalePipe],
})
export class I18nModule extends I18nModuleBase {}
