import { I18nModuleOptions } from './i18n-module.options';
import { createI18nDecorator } from './i18n-decorator';
import { I18nModule } from './i18n.module';

export const createI18n = (options: I18nModuleOptions) => {
  return {
    UseI18n: createI18nDecorator(options),
    I18nModule: I18nModule.register(options),
  };
};
