import {
  env,
  raw,
  each,
  TRACKER,
  IS_PROXY,
  shallowCopy,
  createHiddenProperty,
} from './commons';
import { createPlainTrackerObject } from './StateTracker';
import { State, IndexType, IStateTracker, ProduceProxyOptions } from './types';
import StateTrackerContext from './StateTrackerContext';
import StateTrackerUtil from './StateTrackerUtil';
import Container from './Container';

export function produceImpl(
  state: State,
  // affected?: WeakMap<object, IStateTracker>,
  proxyCache?: WeakMap<object, IStateTracker>
) {
  const container = new Container({ state });
  const stateTrackerContext = new StateTrackerContext({
    proxyCache,
    // affected,
    container,
  });

  const proxy = createES5Proxy(state, {
    stateTrackerContext,
    accessPath: [],
    rootPath: [],
  });

  return proxy;
}

export function createES5Proxy(
  state: State,
  options: ProduceProxyOptions
): IStateTracker {
  const {
    parentProxy = null,
    accessPath = [],
    rootPath = [],
    stateTrackerContext,
  } = options || {};

  if (!Object.isExtensible(state)) {
    if (env !== 'production') {
      console.warn(
        `[state-tracker]: ${state} is not an extensible object, So its value ` +
          `change will not be tracked`
      );
    }
    return state as any;
  }
  const copy = shallowCopy(state);
  const outerAccessPath = accessPath;

  function createES5ProxyProperty({
    target,
    prop,
    enumerable = false,
    configurable = false,
  }: {
    target: IStateTracker | State;
    prop: PropertyKey;
    enumerable: boolean;
    configurable: boolean;
  }) {
    const description = {
      enumerable,
      configurable,
      get(this: IStateTracker) {
        const tracker = this[TRACKER];
        // base could not be a proxy object, or go to loop
        const base = raw(tracker._base);
        const nextAccessPath = accessPath.concat(prop as string);
        const isPeeking = tracker._isPeeking;
        // const nextValue = base[prop as string];
        // const childrenProxies = tracker._childrenProxies;

        const value = StateTrackerUtil.resolveNextValue({
          value: base[prop],
          // tracker,
          stateTrackerContext,
          nextAccessPath: nextAccessPath.slice(),
          proxy: copy,
          rootPath,
          createProxy: createES5Proxy,
        });

        if (!isPeeking) {
          if (stateTrackerContext.getCurrent()) {
            stateTrackerContext.getCurrent().track({
              target,
              // isDerived,
              value: value,
              key: prop as string,
              path: outerAccessPath.concat(prop as string),
            });
          }
        }

        return value;
      },
      set(this: IStateTracker, newValue: any) {
        const tracker = this[TRACKER];
        const base = tracker._base;
        const currentValue = base[prop as string];
        const childrenProxies = tracker._childrenProxies;

        if (raw(currentValue) === raw(newValue)) return true;

        base[prop as IndexType] = newValue;

        childrenProxies.delete(currentValue);
        return true;
      },
    };

    Object.defineProperty(target, prop, description);
  }

  const tracker = createPlainTrackerObject({
    // original state should be preserved
    base: state,
    parentProxy,
    accessPath,
    rootPath,
    stateTrackerContext,
    lastUpdateAt: Date.now(),
  });

  each(copy as Array<any>, (prop: PropertyKey) => {
    const desc = Object.getOwnPropertyDescriptor(copy, prop);
    const enumerable = desc?.enumerable || false;
    const configurable = desc?.configurable || false;

    // to avoid redefine property, such `getTracker`, `enter` etc.
    if (!configurable) return;

    createES5ProxyProperty({
      target: copy,
      prop: prop,
      enumerable,
      configurable,
    });
  });

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cant_define_property_object_not_extensible
  // if property value is not extensible, it will cause error. such as a ref value..
  createHiddenProperty(copy, TRACKER, tracker);
  createHiddenProperty(copy, IS_PROXY, true);
  createHiddenProperty(copy, 'unlink', function(this: IStateTracker) {
    const tracker = this[TRACKER];
    return tracker._base;
  });

  if (Array.isArray(copy)) {
    const descriptors = Object.getPrototypeOf([]);
    const keys = Object.getOwnPropertyNames(descriptors);

    const handler = (
      func: Function,
      functionContext: IStateTracker,
      lengthGetter = true
    ) =>
      function(this: IStateTracker) {
        const args = Array.prototype.slice.call(arguments); // eslint-disable-line
        if (lengthGetter) {
          const tracker = this[TRACKER];

          const accessPath = tracker._accessPath;
          const isPeeking = tracker._isPeeking;
          const nextAccessPath = accessPath.concat('length');

          if (!isPeeking) {
            if (stateTrackerContext.getCurrent()) {
              stateTrackerContext.getCurrent().track({
                target: copy,
                value: copy.length,
                key: 'length',
                path: nextAccessPath,
              });
            }
          }
        }

        return func.apply(functionContext, args);
      };

    keys.forEach(key => {
      const func = descriptors[key];
      if (typeof func === 'function') {
        const notRemarkLengthPropKeys = ['concat', 'copyWith'];
        // For these function, length should be tracked
        const remarkLengthPropKeys = [
          'concat',
          'copyWith',
          'fill',
          'find',
          'findIndex',
          'lastIndexOf',
          'pop',
          'push',
          'reverse',
          'shift',
          'unshift',
          'slice',
          'sort',
          'splice',
          'includes',
          'indexOf',
          'join',
          'keys',
          'entries',
          'forEach',
          'filter',
          'flat',
          'flatMap',
          'map',
          'every',
          'some',
          'reduce',
          'reduceRight',
        ];
        if (notRemarkLengthPropKeys.indexOf(key) !== -1) {
          createHiddenProperty(copy, key, handler(func, copy as any, false));
        } else if (remarkLengthPropKeys.indexOf(key) !== -1) {
          createHiddenProperty(copy, key, handler(func, copy as any));
        }
      }
    });
  }

  return copy as IStateTracker;
}
