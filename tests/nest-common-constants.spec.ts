describe('nest common constants', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('@nestjs/common/constants');
  });

  test('uses Nest common constants when the private subpath is available', () => {
    jest.isolateModules(() => {
      jest.doMock(
        '@nestjs/common/constants',
        () => ({
          PARAMTYPES_METADATA: 'custom:paramtypes',
          SELF_DECLARED_DEPS_METADATA: 'custom:self:paramtypes',
        }),
        { virtual: true },
      );

      const constants = require('../src/utility/nest-common-constants');

      expect(constants.PARAMTYPES_METADATA).toBe('custom:paramtypes');
      expect(constants.SELF_DECLARED_DEPS_METADATA).toBe(
        'custom:self:paramtypes',
      );
    });
  });

  test('falls back to built-in constants when the private subpath is unavailable', () => {
    jest.isolateModules(() => {
      jest.doMock(
        '@nestjs/common/constants',
        () => {
          throw new Error('Cannot import private subpath');
        },
        { virtual: true },
      );

      const constants = require('../src/utility/nest-common-constants');

      expect(constants.PARAMTYPES_METADATA).toBe('design:paramtypes');
      expect(constants.SELF_DECLARED_DEPS_METADATA).toBe('self:paramtypes');
    });
  });
});
