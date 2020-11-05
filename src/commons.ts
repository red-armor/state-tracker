import { IStateTracker, SeenKeys } from './types';

export const DEFAULT_MASK = '__mask_$$';
const toString = Function.call.bind<Function>(Object.prototype.toString);
const ownKeys = (o: any) =>
  typeof Reflect !== 'undefined' && Reflect.ownKeys
    ? Reflect.ownKeys(o)
    : typeof Object.getOwnPropertySymbols !== 'undefined'
    ? Object.getOwnPropertyNames(o).concat(
        Object.getOwnPropertySymbols(o) as any
      )
    : Object.getOwnPropertyNames(o);

export const arrayProtoOwnKeys = () => ownKeys(Object.getPrototypeOf([]));
export const objectProtoOwnKeys = () => ownKeys(Object.getPrototypeOf({}));

export const emptyFunction = () => {};
export const isObject = (o: any) => o ? (typeof o === 'object' || typeof o === 'function') : false // eslint-disable-line
export const hasSymbol = typeof Symbol !== 'undefined';
export const TRACKER: unique symbol = hasSymbol
  ? Symbol.for('tracker')
  : ('__tracker__' as any);
export const PATH_TRACKER: unique symbol = hasSymbol
  ? Symbol.for('path_tracker')
  : ('__path_tracker__' as any);

export const canIUseProxy = () => {
  try {
    new Proxy({}, {}) // eslint-disable-line
  } catch (err) {
    return false;
  }

  return true;
};

export const hasOwnProperty = (o: object, prop: PropertyKey) => o.hasOwnProperty(prop) // eslint-disable-line

export const isTrackable = (o: any) => { // eslint-disable-line
  return ['[object Object]', '[object Array]'].indexOf(toString(o)) !== -1;
};

export const isTypeEqual = (a: any, b: any) => toString(a) === toString(b);
export const isArray = (a: any) => Array.isArray(a);
export const isPlainObject = (a: any) => toString(a) === '[object Object]';

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
  if (Array.isArray(o)) return o.slice();
  const value = Object.create(Object.getPrototypeOf(o));
  ownKeys(o).forEach(key => {
    value[key] = o[key];
  });

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

export const peek = (proxyState: IStateTracker, accessPath: Array<string>) => {
  return accessPath.reduce((nextProxyState, cur: string) => {
    const tracker = nextProxyState[TRACKER];
    tracker.setPeeking(true);
    const nextProxy = nextProxyState[cur];
    tracker.setPeeking(false);
    return nextProxy;
  }, proxyState);
};

const seenKeys: SeenKeys = {};
const MULTIPLIER = Math.pow(2, 24) // eslint-disable-line

export const generateRandomKey = (prefix = '') => {
  let key;

  while (key === undefined || seenKeys.hasOwnProperty(key) || !isNaN(+key)) { // eslint-disable-line
    key = Math.floor(Math.random() * MULTIPLIER).toString(32);
  }

  const nextKey = `${prefix}${key}`;

  seenKeys[nextKey] = true;
  return nextKey;
};

export const generateRandomContextKey = () => generateRandomKey('__context_');
export const generateRandomFocusKey = () => generateRandomKey('__focus_');
