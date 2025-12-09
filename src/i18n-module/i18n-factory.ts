import { I18nModuleOptions } from './i18n-module.options';
import { createI18nDecorator } from './i18n-decorator';
import { I18nModule } from './i18n.module';
import { ParamResolverInput } from '../resolver';

export const createI18n = (
  options: Omit<I18nModuleOptions, 'resolver'> & {
    resolver?: ParamResolverInput;
  },
) => {
  if (!options.resolver) {
    options.resolver = {
      paramType: 'header',
      paramName: 'x-client-language',
    };
  }
  return {
    UseI18n: createI18nDecorator(options as I18nModuleOptions),
    I18nModule: I18nModule.register(options as I18nModuleOptions),
  };
};
