import { I18nModuleOptions } from './i18n-module.options';
import { createI18nDecorator } from './i18n-decorator';
import { I18nModule } from './i18n.module';
import { getParamResolver, ParamResolverInput } from '../resolver';
import { LocaleContext } from './locale.context';
import { I18nParamResolverProviderToken } from './i18n-param-resolver.token';
import { createProvider } from '../create-provider';

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
  const resolver = getParamResolver(options.resolver);
  const paramProvider = resolver.toRequestScopedProvider();
  const module = I18nModule.register(options as I18nModuleOptions);
  module.providers ??= [];
  module.exports ??= [];
  module.providers.push(
    paramProvider.provider,
    LocaleContext,
    // re-exports the resolved param value for LocaleContext injection
    createProvider(
      {
        provide: I18nParamResolverProviderToken,
        inject: [paramProvider.token],
      },
      (s) => s,
    ),
  );
  module.exports.push(paramProvider.provider, LocaleContext);
  return {
    UseI18n: createI18nDecorator(options as I18nModuleOptions),
    I18nModule: module,
    I18nParamResolver: resolver,
    I18nParamResolverProvider: paramProvider,
  };
};
