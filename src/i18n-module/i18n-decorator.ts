import { I18nModuleOptions, I18nResolverStatic } from './i18n-module.options';
import { MergeClassOrMethodDecorators } from '../merge';
import { UseInterceptors } from '@nestjs/common';
import { I18nInterceptor } from './i18n.interceptor';
import {
  ApiHeader,
  ApiHeaderOptions,
  ApiQuery,
  ApiQueryOptions,
} from '@nestjs/swagger';

export const createI18nDecorator = (options: I18nModuleOptions) => {
  const paramType = (options.resolver as I18nResolverStatic)?.paramType;
  const apiOptions: ApiHeaderOptions | ApiQueryOptions = {
    name: (options.resolver as I18nResolverStatic).paramName,
    description: 'Locale for internationalization',
    required: false,
    default: options.defaultLocale ?? options.locales[0],
    enum: options.locales,
  };
  const dec: () => ClassDecorator & MethodDecorator =
    paramType === 'header'
      ? () => ApiHeader(apiOptions)
      : paramType === 'query'
        ? () => ApiQuery({ ...apiOptions, type: 'string' })
        : () => () => {};
  return () =>
    MergeClassOrMethodDecorators([
      UseInterceptors(I18nInterceptor),
      ...(paramType ? [dec()] : []),
    ]);
};
