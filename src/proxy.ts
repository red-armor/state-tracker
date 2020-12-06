import {
  TRACKER,
  PATH_TRACKER,
  isObject,
  isTrackable,
  isTypeEqual,
  createHiddenProperty,
  arrayProtoOwnKeys,
  objectProtoOwnKeys,
  Type,
  generateRandomFocusKey,
} from './commons';
import { createPlainTrackerObject } from './StateTracker';
import PathTracker from './PathTracker';
import {
  IStateTracker,
  ProduceState,
  ProduceProxyOptions,
  StateTrackerProperties,
} from './types';
import StateTrackerContext from './StateTrackerContext';
import StateTrackerUtil from './StateTrackerUtil';
import collection from './collection';

function produce(
  state: ProduceState,
  options?: ProduceProxyOptions
): IStateTracker {
  const {
    parentProxy = null,
    accessPath = [],
    rootPath = [],
    stateTrackerContext,
    mayReusedTracker,
    focusKey = null,
  } = options || {};
  const outerAccessPath = accessPath;

  const trackerContext = stateTrackerContext || new StateTrackerContext();

  const internalKeys = [TRACKER, PATH_TRACKER, 'unlink'];

  const handler = {
    get: (target: IStateTracker, prop: PropertyKey, receiver: any) => {
      try {
        if (internalKeys.indexOf(prop as string | symbol) !== -1)
          return Reflect.get(target, prop, receiver);
        if (typeof prop === 'symbol')
          return Reflect.get(target, prop, receiver);
        let tracker = Reflect.get(target, TRACKER) as StateTrackerProperties;
        const targetType = tracker._type;

        switch (targetType) {
          case Type.Array:
            if (prop !== 'length' && ~arrayProtoOwnKeys().indexOf(prop))
              return Reflect.get(target, prop, receiver);
            break;
          case Type.Object:
            if (~objectProtoOwnKeys().indexOf(prop))
              return Reflect.get(target, prop, receiver);
            break;
        }

        if (tracker._isStrictPeeking)
          return Reflect.get(target, prop, receiver);

        // Note: `getBase` can get the latest value, Maybe it's the dispatched value.
        // It means if you call relink to update a key's value, then we can get the
        // value here...
        let base = tracker._base;
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

        if (
          isObject(base) &&
          StateTrackerUtil.hasTracker(base as IStateTracker)
        ) {
          const baseTracker = StateTrackerUtil.getTracker(
            base as IStateTracker
          );
          baseTracker._isStrictPeeking = true;
          value = base[prop];
          baseTracker._isStrictPeeking = false;
        } else {
          value = base[prop];
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
              StateTrackerUtil.hasTracker(value) &&
              childProxyBase === StateTrackerUtil.getTracker(value)._base)
          ) {
            return childProxy;
          }
        }

        if (isObject(value) && StateTrackerUtil.hasTracker(value)) {
          const focusKey = StateTrackerUtil.getTracker(value)._focusKey;
          if (focusKey && focusKeyToTrackerMap[focusKey]) {
            childProxyTracker = StateTrackerUtil.getTracker(
              focusKeyToTrackerMap[focusKey]
            );
          }
        }

        // // if `path` is not change, it will match from childProxy
        // if (isObject(value) && StateTrackerUtil.hasTracker(value)) {
        //   const focusKey = StateTrackerUtil.getTracker(value)._focusKey;
        //   if (focusKey && focusKeyToTrackerMap[focusKey]) {
        //     // focusKey should be update every time it is reused.
        //     const newFocusKey = generateRandomFocusKey()
        //     const reusedProxy = focusKeyToTrackerMap[focusKey]
        //     const reusedTracker = StateTrackerUtil.getTracker(reusedProxy);
        //     const reusedPathTracker = StateTrackerUtil.getPathTracker(reusedProxy);
        //     reusedPathTracker.update(nextAccessPath)
        //     reusedTracker._focusKey = newFocusKey
        //     focusKeyToTrackerMap[newFocusKey] = focusKeyToTrackerMap[focusKey]

        //     if (focusKey !== newFocusKey) {
        //       delete focusKeyToTrackerMap[focusKey!]
        //     }

        //     return focusKeyToTrackerMap[newFocusKey]
        //   }
        // }

        // focusKey is mainly used on remove one item...
        const focusKey = generateRandomFocusKey();

        const producedChildProxy = produce(
          // only new value should create new proxy object..
          // Array.isArray(value) ? value.slice() : { ...value },
          value,
          {
            accessPath: nextAccessPath,
            parentProxy: proxy as IStateTracker,
            rootPath,
            mayReusedTracker: childProxyTracker,
            stateTrackerContext: trackerContext,
            focusKey,
          }
        );

        childProxies[prop as string] = producedChildProxy;
        focusKeyToTrackerMap[focusKey] = producedChildProxy;

        return producedChildProxy;
      } catch (err) {
        console.log('[state-tracker] ', err);
      }
    },
    set: (
      target: IStateTracker,
      prop: PropertyKey,
      newValue: any,
      receiver: any
    ) => {
      const tracker = Reflect.get(target, TRACKER) as StateTrackerProperties;
      const childProxies = tracker._childProxies;
      const base = tracker._base[prop as string];
      const childProxiesKeys = Object.keys(childProxies);
      const len = childProxiesKeys.length;

      if (!isTypeEqual(base, newValue) || !len) {
        // childProxies should be an object! or `delete childProxies[prop as string];` may cause
        // error. such as delete `length` in array
        // https://github.com/ryuever/state-tracker/issues/5
        tracker._childProxies = {};
      }

      return Reflect.set(target, prop, newValue, receiver);
    },
  };

  let nextState = state;

  if (StateTrackerUtil.hasTracker(state as IStateTracker)) {
    nextState = StateTrackerUtil.getTracker(state as IStateTracker)._base;
  }

  let tracker: StateTrackerProperties;

  if (mayReusedTracker && nextState === mayReusedTracker._base) {
    tracker = mayReusedTracker;
  } else {
    tracker = createPlainTrackerObject({
      base: nextState,
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
  const proxy = new Proxy(nextState, handler) as IStateTracker;

  // TODO: Cannot add property x, object is not extensible
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cant_define_property_object_not_extensible
  // if property value is not extensible, it will cause error. such as a ref value..
  createHiddenProperty(proxy, TRACKER, tracker);
  createHiddenProperty(proxy, PATH_TRACKER, pathTracker);
  createHiddenProperty(proxy, 'unlink', function(this: IStateTracker) {
    const tracker = this[TRACKER];
    return tracker._base;
  });

  if (!stateTrackerContext) {
    collection.register({
      base: state,
      proxyState: proxy,
      stateTrackerContext: trackerContext,
    });
  }

  return proxy as IStateTracker;
}

export { produce };
