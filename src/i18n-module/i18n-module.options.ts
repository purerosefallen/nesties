import { ExecutionContext } from '@nestjs/common';
import { Awaitable } from '../utility/awaitable';
import { ModuleRef } from '@nestjs/core';

export interface I18nResolverStatic {
  paramType: 'header' | 'query';
  paramName: string;
}

export type I18nResolverDynamic = (
  ctx: ExecutionContext,
  ref: ModuleRef,
) => Awaitable<string>;

export type I18nResolver = I18nResolverStatic | I18nResolverDynamic;

export interface I18nModuleOptions {
  resolver: I18nResolver;
  locales: string[];
  defaultLocale?: string;
}
