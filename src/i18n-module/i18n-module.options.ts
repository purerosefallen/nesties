import { ResolverDual } from '../resolver';

export interface I18nModuleOptions {
  resolver: ResolverDual;
  locales: string[];
  defaultLocale?: string;
}
