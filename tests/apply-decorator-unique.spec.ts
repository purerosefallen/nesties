import { ApplyDecoratorUnique } from '../src/utility/apply-decorator-unique';

describe('ApplyDecoratorUnique (behavior-only)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ClassDecorator: same identifier only runs once per class', () => {
    const id = Symbol('id');
    const dec = jest.fn<void, [Function]>();
    const wrapped = ApplyDecoratorUnique(dec, id);

    class A {}

    wrapped(A);
    wrapped(A);

    expect(dec).toHaveBeenCalledTimes(1);
  });

  it('ClassDecorator: different identifiers both run once', () => {
    const dec = jest.fn<void, [Function]>();
    const w1 = ApplyDecoratorUnique(dec, Symbol('id1'));
    const w2 = ApplyDecoratorUnique(dec, Symbol('id2'));

    class A {}

    w1(A);
    w2(A);
    w1(A);
    w2(A);

    expect(dec).toHaveBeenCalledTimes(2);
  });

  it('MethodDecorator: same identifier only runs once per (class, method)', () => {
    const id = Symbol('id');
    const dec = jest.fn<any, [object, string | symbol, PropertyDescriptor]>();
    const wrapped = ApplyDecoratorUnique(dec, id);

    class A {
      foo() {
        return 1;
      }
    }

    const desc = Object.getOwnPropertyDescriptor(A.prototype, 'foo')!;
    wrapped(A.prototype, 'foo', desc);
    wrapped(A.prototype, 'foo', desc);

    expect(dec).toHaveBeenCalledTimes(1);
  });

  it('MethodDecorator: same identifier on different methods should run once per method', () => {
    const id = Symbol('id');
    const dec = jest.fn<any, [object, string | symbol, PropertyDescriptor]>();
    const wrapped = ApplyDecoratorUnique(dec, id);

    class A {
      foo() {
        return 1;
      }
      bar() {
        return 2;
      }
    }

    const fooDesc = Object.getOwnPropertyDescriptor(A.prototype, 'foo')!;
    const barDesc = Object.getOwnPropertyDescriptor(A.prototype, 'bar')!;

    wrapped(A.prototype, 'foo', fooDesc);
    wrapped(A.prototype, 'foo', fooDesc);
    wrapped(A.prototype, 'bar', barDesc);
    wrapped(A.prototype, 'bar', barDesc);

    expect(dec).toHaveBeenCalledTimes(2);
  });

  it('PropertyDecorator: same identifier only runs once per (class, property)', () => {
    const id = Symbol('id');
    const dec = jest.fn<void, [object, string | symbol]>();
    const wrapped = ApplyDecoratorUnique(dec, id);

    class A {
      prop!: number;
    }

    wrapped(A.prototype, 'prop');
    wrapped(A.prototype, 'prop');

    expect(dec).toHaveBeenCalledTimes(1);
  });

  it('PropertyDecorator: same identifier on different properties should run once per property', () => {
    const id = Symbol('id');
    const dec = jest.fn<void, [object, string | symbol]>();
    const wrapped = ApplyDecoratorUnique(dec, id);

    class A {
      a!: number;
      b!: number;
    }

    wrapped(A.prototype, 'a');
    wrapped(A.prototype, 'a');
    wrapped(A.prototype, 'b');
    wrapped(A.prototype, 'b');

    expect(dec).toHaveBeenCalledTimes(2);
  });

  it('AccessorDecorator (getter): same identifier only runs once per accessor', () => {
    const id = Symbol('id');
    const dec = jest.fn<any, [object, string | symbol, PropertyDescriptor]>();
    const wrapped = ApplyDecoratorUnique(dec, id);

    class A {
      private _v = 1;
      get value() {
        return this._v;
      }
    }

    const desc = Object.getOwnPropertyDescriptor(A.prototype, 'value')!;
    wrapped(A.prototype, 'value', desc);
    wrapped(A.prototype, 'value', desc);

    expect(dec).toHaveBeenCalledTimes(1);
  });

  it('AccessorDecorator (setter): same identifier only runs once per accessor', () => {
    const id = Symbol('id');
    const dec = jest.fn<any, [object, string | symbol, PropertyDescriptor]>();
    const wrapped = ApplyDecoratorUnique(dec, id);

    class A {
      private _v = 1;
      set value(v: number) {
        this._v = v;
      }
    }

    const desc = Object.getOwnPropertyDescriptor(A.prototype, 'value')!;
    wrapped(A.prototype, 'value', desc);
    wrapped(A.prototype, 'value', desc);

    expect(dec).toHaveBeenCalledTimes(1);
  });

  it('ParameterDecorator (method param): same identifier only runs once per method (not per index)', () => {
    const id = Symbol('id');
    const dec = jest.fn<void, [object, string | symbol, number]>();
    const wrapped = ApplyDecoratorUnique(dec, id);

    class A {
      foo(_x: number, _y: string) {}
    }

    // method param decorator: (target, propertyKey, parameterIndex)
    wrapped(A.prototype, 'foo', 0);
    wrapped(A.prototype, 'foo', 1); // 你的实现是按 keyName 去重，所以第二次会被跳过

    expect(dec).toHaveBeenCalledTimes(1);
  });

  it('ParameterDecorator (constructor param): same identifier only runs once per class', () => {
    const id = Symbol('id');
    const dec = jest.fn<void, [Function, undefined, number]>();
    const wrapped = ApplyDecoratorUnique(dec, id);

    class A {
      constructor(_x: number, _y: string) {}
    }

    // ctor param decorator: (target: Function, propertyKey: undefined, index: number)
    wrapped(A, undefined, 0);
    wrapped(A, undefined, 1);

    expect(dec).toHaveBeenCalledTimes(1);
  });

  it('Static method decorator: same identifier only runs once per (class, staticMethod)', () => {
    const id = Symbol('id');
    const dec = jest.fn<any, [object, string | symbol, PropertyDescriptor]>();
    const wrapped = ApplyDecoratorUnique(dec, id);

    class A {
      static foo() {
        return 1;
      }
    }

    const desc = Object.getOwnPropertyDescriptor(A, 'foo')!;
    wrapped(A, 'foo', desc);
    wrapped(A, 'foo', desc);

    expect(dec).toHaveBeenCalledTimes(1);
  });

  it('Member decorator: different identifiers both run once (same target)', () => {
    const dec = jest.fn<void, [object, string | symbol]>();

    const w1 = ApplyDecoratorUnique(dec, Symbol('id1'));
    const w2 = ApplyDecoratorUnique(dec, Symbol('id2'));

    class A {
      a!: number;
    }

    w1(A.prototype, 'a');
    w2(A.prototype, 'a');
    w1(A.prototype, 'a');
    w2(A.prototype, 'a');

    expect(dec).toHaveBeenCalledTimes(2);
  });
});
