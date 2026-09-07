import * as nesties from 'nesties';

describe('package ESM entry', () => {
  test('loads the public API through the import condition', () => {
    expect(nesties.DataQuery).toBeTypeOf('function');
    expect(nesties.ParamResolver).toBeTypeOf('function');
    expect(nesties.ReturnMessageDto).toBeTypeOf('function');
  });
});
