export interface NestCommonConstants {
  PARAMTYPES_METADATA: string;
  SELF_DECLARED_DEPS_METADATA: string;
}

export const PARAMTYPES_METADATA: NestCommonConstants['PARAMTYPES_METADATA'] =
  'design:paramtypes';
export const SELF_DECLARED_DEPS_METADATA: NestCommonConstants['SELF_DECLARED_DEPS_METADATA'] =
  'self:paramtypes';
