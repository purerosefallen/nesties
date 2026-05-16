export interface NestCommonConstants {
  PARAMTYPES_METADATA: string;
  SELF_DECLARED_DEPS_METADATA: string;
}

const FALLBACK_COMMON_CONSTANTS: NestCommonConstants = {
  PARAMTYPES_METADATA: 'design:paramtypes',
  SELF_DECLARED_DEPS_METADATA: 'self:paramtypes',
};

function loadNestCommonConstants(): NestCommonConstants {
  try {
    const req = typeof require === 'function' ? require : undefined;
    const constants = req?.('@nestjs/common/constants');

    if (constants) {
      return {
        ...FALLBACK_COMMON_CONSTANTS,
        PARAMTYPES_METADATA:
          constants.PARAMTYPES_METADATA ??
          FALLBACK_COMMON_CONSTANTS.PARAMTYPES_METADATA,
        SELF_DECLARED_DEPS_METADATA:
          constants.SELF_DECLARED_DEPS_METADATA ??
          FALLBACK_COMMON_CONSTANTS.SELF_DECLARED_DEPS_METADATA,
      };
    }
  } catch {
    // ESM consumers cannot import @nestjs/common/constants without file extensions.
  }

  return FALLBACK_COMMON_CONSTANTS;
}

export const { PARAMTYPES_METADATA, SELF_DECLARED_DEPS_METADATA } =
  loadNestCommonConstants();
