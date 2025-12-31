import { Inject, Injectable, Scope } from '@nestjs/common';
import { I18nParamResolverProviderToken } from './i18n-param-resolver.token';
import { I18nService } from './i18n.service';

@Injectable({ scope: Scope.REQUEST })
export class LocaleContext {
  constructor(
    @Inject(I18nParamResolverProviderToken) private localeInput: string,
    @Inject(I18nService)
    private i18nService: I18nService,
  ) {}

  locale = this.i18nService.getExactLocale(this.localeInput);

  translate<T>(v: T) {
    return this.i18nService.translate(this.locale, v);
  }
}
