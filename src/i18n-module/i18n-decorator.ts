import { I18nModuleOptions } from './i18n-module.options';
import { ApiFromResolver } from '../resolver';
import { MergeClassOrMethodDecorators } from '../merge';
import { UseInterceptors } from '@nestjs/common';
import { I18nInterceptor } from './i18n.interceptor';

export const createI18nDecorator = (options: I18nModuleOptions) => {
  return () =>
    MergeClassOrMethodDecorators([
      UseInterceptors(I18nInterceptor),
      ApiFromResolver(options.resolver, {
        description: 'Locale for internationalization',
        required: false,
        default: options.defaultLocale ?? options.locales[0],
        enum: options.locales,
      }),
    ]);
};
