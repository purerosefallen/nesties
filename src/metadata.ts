import { MetadataSetter, Reflector } from 'typed-reflector';
import { RequireTokenOptions } from './token.guard';

interface MetadataMap {
  requireTokenOptions: RequireTokenOptions;
}

interface MetadataArrayMap {
  usedUniqueDecoratorIdentifiers: any;
}

export const reflector = new Reflector<MetadataMap, MetadataArrayMap>();
export const Metadata = new MetadataSetter<MetadataMap, MetadataArrayMap>();
