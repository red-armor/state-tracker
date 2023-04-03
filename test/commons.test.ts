import {
  fastJoin,
  shallowEqual,
  pathEqual,
  isPrimitive,
  isMutable,
  isBoolean,
  isString,
  isNumber,
  isTypeEqual,
  isArray,
  isPlainObject,
  isFunction,
  hideProperty,
  generateTrackerMapKey,
  generateRandomKey,
  generateRandomContextKey,
  generateRandomFocusKey,
  hasOwnProperty,
  peek,
  emptyFunction,
} from '../src/commons';

// fastJoin
describe('fastJoin', () => {
  test('should join an array of strings and numbers with a separator', () => {
    const arr = ['hello', 42, 'world'];
    const sep = '-';
    expect(fastJoin(arr, sep)).toBe('hello-42-world');
  });

  test('should return an empty string for empty array', () => {
    const arr: (string | number)[] = [];
    const sep = '-';
    expect(fastJoin(arr, sep)).toBe('');
  });

  test('should handle arrays with length greater than 100', () => {
    const arr = new Array(101).fill('a');
    const sep = '-';
    expect(fastJoin(arr, sep)).toBe(arr.join(sep));
  });

  test('should handle arrays with only one element', () => {
    const arr = ['single'];
    const sep = '-';
    expect(fastJoin(arr, sep)).toBe('single');
  });
});

// shallowEqual
describe('shallowEqual', () => {
  test('should return true for two empty objects', () => {
    const obj1 = {};
    const obj2 = {};
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  test('should return true for two objects with same primitive values', () => {
    const obj1 = { a: 1, b: 'hello', c: true };
    const obj2 = { a: 1, b: 'hello', c: true };
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  test('should return true for objects with same object property references', () => {
    const inner = { b: 1 };
    const obj1 = { a: inner };
    const obj2 = { a: inner };
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  test('should return true for objects is same object', () => {
    const inner = { b: 1 };
    const obj1 = inner;
    const obj2 = inner;
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  test('should return false for number', () => {
    const obj1 = 0;
    const obj2 = 0;
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  test('should return false for NaN', () => {
    const obj1 = NaN;
    const obj2 = NaN;
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  test('should return false for two objects with different primitive values', () => {
    const obj1 = { a: 1, b: 'hello', c: true };
    const obj2 = { a: 2, b: 'world', c: false };
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  test('should return false for objects with different number of keys', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 2, c: 3 };
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  test('should return false for objects with different keys', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, c: 2 };
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  test('should return false for objects with different object property references', () => {
    const obj1 = { a: { b: 1 } };
    const obj2 = { a: { b: 1 } };
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  test('should return false for different type data', () => {
    const obj1 = { a: 1 };
    const obj2 = null;
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });
});

//pathEqual
describe('pathEqual', () => {
  test('should return true when two paths are equal', () => {
    const a = ['path', 'to', 42];
    const b = ['path', 'to', 42];
    expect(pathEqual(a, b)).toBe(true);
  });

  test('should return false when two paths have different length', () => {
    const a = ['path', 'to', 42];
    const b = ['path', 42];
    expect(pathEqual(a, b)).toBe(false);
  });

  test('should return false when two paths have different elements', () => {
    const a = ['path', 'to', 42];
    const b = ['path', 'to', 99];
    expect(pathEqual(a, b)).toBe(false);
  });

  test('should handle empty arrays as input', () => {
    const a: Array<string | number> = [];
    const b: Array<string | number> = [];
    expect(pathEqual(a, b)).toBe(true);
  });
});

describe('Type checking functions', () => {
  test('isNumber should return true for numbers and false for other types', () => {
    expect(isNumber(42)).toBe(true);
    expect(isNumber('42')).toBe(false);
    expect(isNumber(true)).toBe(false);
    expect(isNumber([42])).toBe(false);
    expect(isNumber({ a: 42 })).toBe(false);
    expect(isNumber(() => {})).toBe(false);
  });

  test('isString should return true for strings and false for other types', () => {
    expect(isString('hello')).toBe(true);
    expect(isString(42)).toBe(false);
    expect(isString(true)).toBe(false);
    expect(isString([42])).toBe(false);
    expect(isString({ a: 'hello' })).toBe(false);
    expect(isString(() => {})).toBe(false);
  });

  test('isBoolean should return true for booleans and false for other types', () => {
    expect(isBoolean(true)).toBe(true);
    expect(isBoolean(42)).toBe(false);
    expect(isBoolean('true')).toBe(false);
    expect(isBoolean([true])).toBe(false);
    expect(isBoolean({ a: true })).toBe(false);
    expect(isBoolean(() => {})).toBe(false);
  });

  test('isMutable should return true for objects and arrays, and false for other types', () => {
    expect(isMutable([])).toBe(true);
    expect(isMutable({})).toBe(true);
    expect(isMutable(42)).toBe(false);
    expect(isMutable('hello')).toBe(false);
    expect(isMutable(true)).toBe(false);
    expect(isMutable(() => {})).toBe(true);
  });

  test('isPrimitive should return true for numbers, strings, and booleans, and false for other types', () => {
    expect(isPrimitive(42)).toBe(true);
    expect(isPrimitive('hello')).toBe(true);
    expect(isPrimitive(true)).toBe(true);
    expect(isPrimitive([])).toBe(false);
    expect(isPrimitive({})).toBe(false);
    expect(isPrimitive(() => {})).toBe(false);
  });

  test('isTypeEqual should return true when two objects have the same type', () => {
    expect(isTypeEqual(42, 99)).toBe(true);
    expect(isTypeEqual('hello', 'world')).toBe(true);
    expect(isTypeEqual(true, false)).toBe(true);
    expect(isTypeEqual([], [1, 2, 3])).toBe(true);
    expect(isTypeEqual({}, { a: 1 })).toBe(true);
    expect(
      isTypeEqual(
        () => {},
        () => {}
      )
    ).toBe(true);
  });

  test('isArray should return true for arrays and false for other types', () => {
    expect(isArray([])).toBe(true);
    expect(isArray([1, 2, 3])).toBe(true);
    expect(isArray({})).toBe(false);
    expect(isArray(42)).toBe(false);
    expect(isArray('hello')).toBe(false);
    expect(isArray(() => {})).toBe(false);
  });

  test('isPlainObject should return true for plain objects and false for other types', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1, b: 2 })).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject('hello')).toBe(false);
    expect(isPlainObject(() => {})).toBe(false);
  });

  test('isFunction should return true for functions and false for other types', () => {
    expect(isFunction(() => {})).toBe(true);
    expect(isFunction(function() {})).toBe(true);
    expect(isFunction(async function() {})).toBe(true);
    expect(isFunction({ func: () => {} }.func)).toBe(true);
    expect(isFunction([])).toBe(false);
    expect(isFunction({})).toBe(false);
    expect(isFunction(42)).toBe(false);
    expect(isFunction('hello')).toBe(false);
    expect(isFunction(true)).toBe(false);
  });
});

// hideProperty
describe('hideProperty', () => {
  test('should make a property non-enumerable and non-configurable', () => {
    const obj = { a: 1 };
    hideProperty(obj, 'a');
    const propDesc = Object.getOwnPropertyDescriptor(obj, 'a');
    expect(propDesc?.enumerable).toBe(false);
    expect(propDesc?.configurable).toBe(false);
  });
});

// generateTrackerMapKey
describe('generateTrackerMapKey', () => {
  test('should generate correct tracker map key for an access path', () => {
    const accessPath = ['a', 'b', 'c'];
    const expectedKey = 'a, b, c';
    expect(generateTrackerMapKey(accessPath)).toBe(expectedKey);
  });

  test('should return empty string for empty access path', () => {
    const accessPath: Array<string> = [];
    expect(generateTrackerMapKey(accessPath)).toBe('');
  });
});

// generateRandomKey
describe('generateRandomKey', () => {
  test('should generate a random key with the specified prefix', () => {
    const prefix = 'test_';
    const key = generateRandomKey(prefix);
    expect(key.startsWith(prefix)).toBe(true);
  });

  test('should generate a unique key that has not been generated before', () => {
    const key1 = generateRandomKey();
    const key2 = generateRandomKey();
    expect(key1).not.toBe(key2);
  });

  test('should not generate numeric keys', () => {
    const key = generateRandomKey();
    expect(!isNaN(+key)).toBe(false);
  });
});

describe('generateRandomContextKey', () => {
  test('should generate a context key prefixed with "__context_"', () => {
    const key = generateRandomContextKey();
    expect(key.startsWith('__context_')).toBe(true);
  });
});

describe('generateRandomFocusKey', () => {
  test('should generate a focus key prefixed with "__focus_"', () => {
    const key = generateRandomFocusKey();
    expect(key.startsWith('__focus_')).toBe(true);
  });
});

// hasOwnProperty
describe('hasOwnProperty', () => {
  test('should return true for own properties of an object', () => {
    const obj = { a: 1 };
    expect(hasOwnProperty(obj, 'a')).toBe(true);
  });

  test('should return false for inherited properties of an object', () => {
    const parent = { a: 1 };
    const child = Object.create(parent);
    expect(hasOwnProperty(child, 'a')).toBe(false);
  });

  test('should return false for non-existent properties of an object', () => {
    const obj = { a: 1 };
    expect(hasOwnProperty(obj, 'b')).toBe(false);
  });
});

// peek
describe('peek', () => {
  test('should peak return a null', () => {
    const peekRes = peek({}, ['app'], ['data', 'list', '0']);
    expect(peekRes).toBe(null);
    const peekResOther = peek(null as any, ['app'], ['data', 'list', '0']);
    expect(peekResOther).toBe(null);
  });

  test('should peak return correct answer', () => {
    const peekRes = peek(
      { list: { select: 3 } },
      ['app'],
      ['app', 'list', 'select']
    );
    expect(peekRes).toBe(3);
  });
});

// emptyFunction
describe('emptyFunction', () => {
  it('should be a function', () => {
    expect(typeof emptyFunction).toBe('function');
  });

  it('should return undefined', () => {
    const result = emptyFunction();
    expect(result).toBeUndefined();
  });
});
