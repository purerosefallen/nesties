import { ConfigurableModuleBuilder } from '@nestjs/common';
import { I18nModuleOptions } from './i18n-module.options';

export const I18nResolverToken = Symbol('I18nResolverToken');

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<I18nModuleOptions>()
    // .setExtras({}, (def) => ({ ...def, global: true }))
    .build();
export const I18nModuleOptionsToken = MODULE_OPTIONS_TOKEN;
export { ConfigurableModuleClass as I18nModuleBase };
