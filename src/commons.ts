import StateTrackerUtil from './StateTrackerUtil';
import { SeenKeys } from './types';

export const env =
  'process' in globalThis ? process?.env?.NODE_ENV : 'production';

const toString = Function.call.bind<Function>(Object.prototype.toString);
const ownKeys = (o: any) =>
  typeof Reflect !== 'undefined' && Reflect.ownKeys
    ? Reflect.ownKeys(o)
    : typeof Object.getOwnPropertySymbols !== 'undefined'
    ? Object.getOwnPropertyNames(o).concat(
        Object.getOwnPropertySymbols(o) as any
      )
    : Object.getOwnPropertyNames(o);

export const arrayProtoOwnKeys = new Set(ownKeys(Object.getPrototypeOf([])));
export const objectProtoOwnKeys = new Set(ownKeys(Object.getPrototypeOf({})));

export const emptyFunction = () => {};

// https://stackoverflow.com/questions/7299010/why-is-string-concatenation-faster-than-array-join/54970240#54970240
export function fastJoin(arr: (string | number)[], sep: string) {
  if (arr.length > 100) {
    return arr.join(sep);
  }
  let str = '';
  for (let i = 0; i < arr.length; i++) {
    if (i !== 0) str += sep;
    str += arr[i];
  }
  return str;
}

export const isObject = (o: any) =>
  o ? typeof o === 'object' || typeof o === 'function' : false; // eslint-disable-line
export const hasSymbol = typeof Symbol !== 'undefined';
export const TRACKER: unique symbol = hasSymbol
  ? Symbol.for('tracker')
  : ('__tracker__' as any);
export const IS_PROXY: unique symbol = hasSymbol
  ? Symbol.for('is_proxy')
  : ('__is_proxy__' as any);

export const canIUseProxy = (() => {
  try {
    new Proxy({}, {}); // eslint-disable-line
  } catch (err) {
    return false;
  }
  return true;
})();

export const hasOwnProperty = (o: object, prop: PropertyKey) =>
  o.hasOwnProperty(prop); // eslint-disable-line

export const isTrackable = (o: any) => {
  // eslint-disable-line
  const type = toString(o);
  return type === '[object Object]' || type === '[object Array]';
};

export const isNumber = (obj: any) => toString(obj) === '[object Number]';
export const isString = (obj: any) => toString(obj) === '[object String]';
export const isBoolean = (obj: any) => toString(obj) === '[object Boolean]';
export const isMutable = (obj: any) => isObject(obj) || isArray(obj);
export const isPrimitive = (obj: any) =>
  isNumber(obj) || isString(obj) || isBoolean(obj);
export const isTypeEqual = (a: any, b: any) => toString(a) === toString(b);
export const isArray = (a: any) => Array.isArray(a);
export const isPlainObject = (a: any) => toString(a) === '[object Object]';
export const isFunction = (a: any) => toString(a) === '[object Function]';
type EachArray<T> = (index: number, entry: any, obj: T) => void;
type EachObject<T> = <K extends keyof T>(key: K, entry: T[K], obj: T) => number;

// type EachObject = Array<any> | { [key: string]: any }
type Iter<T extends Array<any> | { [key: string]: any }> = T extends Array<any>
  ? EachArray<T>
  : T extends { [key: string]: any }
  ? EachObject<T>
  : never;

export function each<T>(obj: T, iter: Iter<T>) {
  if (Array.isArray(obj)) {
    (obj as Array<any>).forEach((entry, index) =>
      (iter as EachArray<T>)(index, entry, obj)
    );
  } else if (isObject(obj)) {
    // @ts-ignore
    ownKeys(obj).forEach(key => (iter as EachObject<T>)(key, obj[key], obj));
  }
}

export const Type = {
  Object: 'object',
  Array: 'array',
};

export function shallowCopy(o: any) {
  // shallowCopy should not track key
  const tracker = StateTrackerUtil.getTracker(o) || { _isPeeking: true };
  tracker._isPeeking = true;
  if (Array.isArray(o)) return o.slice();
  const value = Object.create(Object.getPrototypeOf(o));
  ownKeys(o).forEach(key => {
    value[key] = o[key];
  });
  tracker._isPeeking = false;

  return value;
}

export const inherit = (
  subClass: {
    prototype: any;
    // __proto__: any;
  },
  superClass: {
    prototype: any;
  }
) => {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  // subClass.__proto__ = superClass // eslint-disable-line
};

export const createHiddenProperty = (
  target: object,
  prop: PropertyKey,
  value: any
) => {
  Object.defineProperty(target, prop, {
    value,
    enumerable: false,
    writable: true,
  });
};

export const hideProperty = (target: object, prop: PropertyKey) => {
  Object.defineProperty(target, prop, {
    enumerable: false,
    configurable: false,
  });
};

export const generateTrackerMapKey = (accessPath: Array<string>): string => {
  return accessPath.join(', ');
};

const seenKeys: SeenKeys = {};
const MULTIPLIER = Math.pow(2, 24); // eslint-disable-line

export const generateRandomKey = (prefix = '') => {
  let key;

  while (key === undefined || seenKeys.hasOwnProperty(key) || !isNaN(+key)) {
    // eslint-disable-line
    key = Math.floor(Math.random() * MULTIPLIER).toString(32);
  }

  const nextKey = `${prefix}${key}`;

  seenKeys[nextKey] = true;
  return nextKey;
};

export const generateRandomContextKey = () => generateRandomKey('__context_');
export const generateRandomFocusKey = () => generateRandomKey('__focus_');

/**
 * inlined Object.is polyfill to avoid requiring consumers ship their own
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
 */
function is(x: any, y: any) {
  // SameValue algorithm
  if (x === y) {
    // Steps 1-5, 7-10
    // Steps 6.b-6.e: +0 != -0
    // Added the nonzero y check to make Flow happy, but it is redundant
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  }
  // Step 6.a: NaN == NaN
  return x !== x && y !== y; // eslint-disable-line
}

/**
 * Performs equality by iterating through keys on an object and returning false
 * when any key has values which are not strictly equal between the arguments.
 * Returns true when the values of all keys are strictly equal.
 */
export function shallowEqual(objA: any, objB: any) {
  if (is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  for (let i = 0; i < keysA.length; i++) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, keysA[i]) ||
      !is(objA[keysA[i]], objB[keysA[i]])
    ) {
      return false;
    }
  }

  return true;
}

export const pathEqual = (
  a: Array<string | number>,
  b: Array<string | number>
) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

let reactionNameCounter = 0;
export const generateReactionName = () =>
  `anonymous_reaction_${reactionNameCounter++}`;

export function peek(
  obj: Object,
  rootPath: Array<string>,
  accessPath: Array<string>
) {
  if (!isTrackable(obj)) return null;
  const rootPathString = fastJoin(rootPath, '_');
  const accessPathString = fastJoin(accessPath, '_');

  const index = accessPathString.indexOf(rootPathString);

  if (index === -1) return null;

  const left = accessPathString.slice(index + rootPathString.length);
  const parts = left.split('_').filter(v => v);
  return parts.reduce((n: { [key: string]: any }, c: string) => {
    return n[c];
  }, obj);
}

export function isProxy(obj: any) {
  if (isTrackable(obj) && obj[IS_PROXY]) return true;
  return false;
}

export function raw(obj: any) {
  if (isProxy(obj)) {
    return StateTrackerUtil.getTracker(obj)._base;
  }

  return obj;
}

export const noop = () => {};

export const DEFAULT_CACHED_PROXY_PATH = '__$__';
export const buildCachedProxyPath = (paths: Array<string | number>) =>
  fastJoin(paths, '_');

export const internalKeys = new Set([TRACKER, 'unlink']);
