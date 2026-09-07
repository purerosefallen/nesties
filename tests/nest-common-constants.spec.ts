import {
  PARAMTYPES_METADATA,
  SELF_DECLARED_DEPS_METADATA,
} from '../src/utility/nest-common-constants';

describe('nest common constants', () => {
  test('uses the stable dependency metadata keys', () => {
    expect(PARAMTYPES_METADATA).toBe('design:paramtypes');
    expect(SELF_DECLARED_DEPS_METADATA).toBe('self:paramtypes');
  });
});
