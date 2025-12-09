import { ParamResolverInput } from '../resolver';
import { I18nOptions } from 'nfkit';

export interface I18nModuleOptions extends I18nOptions {
  resolver: ParamResolverInput;
}
