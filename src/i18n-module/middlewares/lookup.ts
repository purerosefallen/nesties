import { createI18nLookupMiddleware } from 'nfkit';
import { I18nNesties } from '../i18n.types';

export const I18nLookupMiddleware =
  createI18nLookupMiddleware<I18nNesties.Ex>();
