import {
  each,
  TRACKER,
  PATH_TRACKER,
  isTrackable,
  isTypeEqual,
  createHiddenProperty,
  isObject,
} from './commons';
import { createPlainTrackerObject } from './StateTracker';
import {
  IStateTracker,
  ProduceOptions,
  ProduceState,
  IndexType,
  StateTrackerProperties,
} from './types';
import StateTrackerContext from './StateTrackerContext';
import PathTracker from './PathTracker';

function produce(state: ProduceState, options?: ProduceOptions): IStateTracker {
  const {
    parentProxy = null,
    accessPath = [],
    rootPath = [],
    stateTrackerContext,
    mayReusedTracker,
    focusKey = null,
  } = options || {};

  const trackerContext = stateTrackerContext || new StateTrackerContext();
  const shadowBase = Array.isArray(state) ? state.slice() : { ...state };
  const outerAccessPath = accessPath;

  function createES5ProxyProperty({
    target,
    prop,
    enumerable = false,
    configurable = false,
  }: {
    target: IStateTracker | ProduceState;
    prop: PropertyKey;
    enumerable: boolean;
    configurable: boolean;
  }) {
    const description = {
      enumerable,
      configurable,
      get(this: IStateTracker) {
        let tracker = this[TRACKER];
        let base = tracker._shadowBase;
        // will cause `Maximum call stack size exceeded`
        // let base = tracker._base;
        // let base = tracker.getShadowBase();
        const childProxies = tracker._childProxies;
        const focusKeyToTrackerMap = tracker._focusKeyToTrackerMap;
        const nextAccessPath = accessPath.concat(prop as string);
        const isPeeking = tracker._isPeeking;

        if (!isPeeking) {
          if (trackerContext.getCurrent()) {
            trackerContext
              .getCurrent()
              .reportPaths(outerAccessPath.concat(prop as string));
          }
        }

        let value;
        // for rebase value, if base value change, the childProxy should be replaced
        let childProxyTracker = null;
        const childProxy = childProxies[prop as string];

        if (isObject(base) && base.getTracker) {
          const baseTracker = base.getTracker();
          baseTracker._isStrictPeeking = true;
          value = base[prop as string];
          baseTracker._isStrictPeeking = false;
        } else {
          value = base[prop as string];
        }

        if (!isTrackable(value)) {
          // delete childProxies[prop] if it set to unTrackable value.
          if (childProxies[prop as string]) {
            const descriptor = Object.getOwnPropertyDescriptor(
              childProxies,
              prop
            );
            if (descriptor && descriptor.configurable)
              delete childProxies[prop as string];
          }
          return value;
        } else if (!childProxyTracker && childProxy) {
          childProxyTracker = childProxy[TRACKER];
          const childProxyBase = childProxyTracker._base;
          if (
            childProxyBase === value ||
            (isObject(value) &&
              value.getTracker &&
              childProxyBase === value.getTracker()._base)
          ) {
            return childProxy;
          }
        }

        if (isObject(value) && value.getTracker) {
          const focusKey = value.getTracker()._focusKey;
          if (focusKeyToTrackerMap[focusKey]) {
            childProxyTracker = focusKeyToTrackerMap[focusKey].getTracker();
          }
        }

        const focusKey = `focus_${prop as string}`;
        // const focusKey = generateRandomFocusKey();

        const producedChildProxy = produce(
          // only new value should create new proxy object..
          // Array.isArray(value) ? value.slice() : { ...value },
          value,
          {
            accessPath: nextAccessPath,
            parentProxy: state as IStateTracker,
            rootPath,
            mayReusedTracker: childProxyTracker,
            stateTrackerContext: trackerContext,
            focusKey,
          }
        );

        childProxies[prop as string] = producedChildProxy;
        focusKeyToTrackerMap[focusKey] = producedChildProxy;

        return producedChildProxy;
      },
      set(this: IStateTracker, newValue: any) {
        const tracker = this[TRACKER];
        const shadowBase = tracker._shadowBase;
        const childProxies = tracker._childProxies;
        const base = shadowBase[prop as string];
        const childProxiesKeys = Object.keys(childProxies);
        const len = childProxiesKeys.length;

        if (!isTypeEqual(base, newValue) || !len) {
          // childProxies should be an object! or `delete childProxies[prop as string];` may cause
          // error. such as delete `length` in array
          // https://github.com/ryuever/state-tracker/issues/5
          tracker._childProxies = {};
        }

        if (typeof newValue === 'object' && newValue.getTracker) {
          shadowBase[prop as IndexType] = newValue.getTracker()._shadowBase;
        } else {
          shadowBase[prop as IndexType] = newValue;
        }
      },
    };

    Object.defineProperty(target, prop, description);
  }

  // // Tracker is just like an assistant, it could be reused.
  // // However, Tracker node should be created as a new now after call of enter context.
  // if (mayReusedTracker) {
  //   // baseValue should be update on each time or `childProxyBase === value` will
  //   // be always false.
  //   mayReusedTracker.updateShadowBase(shadowBase);
  // }

  // const mapKey = generateTrackerMapKey(accessPath);

  let tracker: StateTrackerProperties;
  let nextState = state;

  if (state.getTracker) {
    nextState = state.getTracker()._base;
  }

  if (mayReusedTracker && nextState === mayReusedTracker._base) {
    tracker = mayReusedTracker;
  } else {
    tracker = createPlainTrackerObject({
      base: nextState,
      shadowBase,
      parentProxy,
      accessPath,
      rootPath,
      stateTrackerContext: trackerContext,
      lastUpdateAt: Date.now(),
      focusKey,
    });
    if (mayReusedTracker) {
      tracker._childProxies = mayReusedTracker._childProxies;
      tracker._focusKeyToTrackerMap = mayReusedTracker._focusKeyToTrackerMap;
    }
  }

  const pathTracker = new PathTracker({
    path: accessPath,
  });

  each(state as Array<any>, (prop: PropertyKey) => {
    const desc = Object.getOwnPropertyDescriptor(state, prop);
    const enumerable = desc?.enumerable || false;
    const configurable = desc?.configurable || false;

    // to avoid redefine property, such `getTracker`, `enter` etc.
    if (!configurable) return;

    createES5ProxyProperty({
      target: state,
      prop: prop,
      enumerable,
      configurable,
    });
  });

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cant_define_property_object_not_extensible
  // if property value is not extensible, it will cause error. such as a ref value..
  createHiddenProperty(state, TRACKER, tracker);
  createHiddenProperty(state, PATH_TRACKER, pathTracker);

  createHiddenProperty(state, 'getTracker', function(this: IStateTracker) {
    return this[TRACKER];
  });
  createHiddenProperty(state, 'unlink', function(this: IStateTracker) {
    const tracker = this[TRACKER];
    return tracker.getShadowBase();
  });

  if (Array.isArray(state)) {
    const descriptors = Object.getPrototypeOf([]);
    const keys = Object.getOwnPropertyNames(descriptors);

    const handler = (
      func: Function,
      functionContext: IStateTracker,
      lengthGetter = true
    ) =>
      function(this: IStateTracker) {
        const args = Array.prototype.slice.call(arguments) // eslint-disable-line
        if (lengthGetter) {
          const tracker = this[TRACKER];

          const accessPath = tracker._accessPath;
          const isPeeking = tracker._isPeeking;
          const nextAccessPath = accessPath.concat('length');

          if (!isPeeking) {
            if (trackerContext.getCurrent()) {
              trackerContext.getCurrent().reportPaths(nextAccessPath);
            }
          }
        }

        return func.apply(functionContext, args);
      };

    keys.forEach(key => {
      const func = descriptors[key];
      if (typeof func === 'function') {
        const notRemarkLengthPropKeys = ['concat', 'copyWith'];
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
          createHiddenProperty(state, key, handler(func, state as any, false));
        } else if (remarkLengthPropKeys.indexOf(key) !== -1) {
          createHiddenProperty(state, key, handler(func, state as any));
        }
      }
    });
  }

  return state as IStateTracker;
}

export { produce };
