import { I18nPiece, parseI18n } from '../src/utility/parse-i18n';

function createTest(
  title: string,
  { input, expected }: { input: string; expected: I18nPiece[] },
) {
  test(title, () => {
    expect(parseI18n(input)).toEqual(expected);
  });
}

describe('parseI18n', () => {
  createTest('raw text only', {
    input: 'hello world',
    expected: [{ type: 'raw', value: 'hello world' }],
  });

  createTest('single placeholder', {
    input: 'hi #{name}!',
    expected: [
      { type: 'raw', value: 'hi ' },
      { type: 'ph', rawInner: 'name', key: 'name' },
      { type: 'raw', value: '!' },
    ],
  });

  createTest('trim spaces inside placeholder', {
    input: 'greet #{  user.name  }',
    expected: [
      { type: 'raw', value: 'greet ' },
      { type: 'ph', rawInner: '  user.name  ', key: 'user.name' },
    ],
  });

  createTest('nested braces inside placeholder', {
    input: '#{ foo {{ bar }} }',
    expected: [
      { type: 'ph', rawInner: ' foo {{ bar }} ', key: 'foo {{ bar }}' },
    ],
  });

  createTest('placeholder contains #{{ sequence', {
    input: '#{ foo #{{ bar }} }',
    expected: [
      { type: 'ph', rawInner: ' foo #{{ bar }} ', key: 'foo #{{ bar }}' },
    ],
  });

  createTest('stray braces outside placeholders', {
    input: '#{ foo } }}}}} {{{{{ #{ bar }',
    expected: [
      { type: 'ph', rawInner: ' foo ', key: 'foo' },
      { type: 'raw', value: ' }}}}} {{{{{ ' },
      { type: 'ph', rawInner: ' bar ', key: 'bar' },
    ],
  });

  createTest('placeholder inside double curly braces', {
    input: 'We {{ #{blue} }} sky',
    expected: [
      { type: 'raw', value: 'We {{ ' },
      { type: 'ph', rawInner: 'blue', key: 'blue' },
      { type: 'raw', value: ' }} sky' },
    ],
  });

  createTest('nested double curly braces inside key', {
    input: 'We {{ #{ blue sky with {{ ocean }} } }}',
    expected: [
      { type: 'raw', value: 'We {{ ' },
      {
        type: 'ph',
        rawInner: ' blue sky with {{ ocean }} ',
        key: 'blue sky with {{ ocean }}',
      },
      { type: 'raw', value: ' }}' },
    ],
  });

  createTest('unclosed placeholder tail treated as raw', {
    input: 'abc #{ foo } def #{ bar',
    expected: [
      { type: 'raw', value: 'abc ' },
      { type: 'ph', rawInner: ' foo ', key: 'foo' },
      { type: 'raw', value: ' def #{ bar' },
    ],
  });

  createTest('JSON inside placeholder', {
    input: '#{ {"a":1,"b":{"c":2}} }',
    expected: [
      {
        type: 'ph',
        rawInner: ' {"a":1,"b":{"c":2}} ',
        key: '{"a":1,"b":{"c":2}}',
      },
    ],
  });

  createTest('multiple placeholders with surrounding text', {
    input: 'X #{a} Y #{b} Z',
    expected: [
      { type: 'raw', value: 'X ' },
      { type: 'ph', rawInner: 'a', key: 'a' },
      { type: 'raw', value: ' Y ' },
      { type: 'ph', rawInner: 'b', key: 'b' },
      { type: 'raw', value: ' Z' },
    ],
  });
});
