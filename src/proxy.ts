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
  DEFAULT_MASK,
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
    context = '',
    focusKey = null,
    mask = DEFAULT_MASK,
  } = options || {};
  const outerAccessPath = accessPath;

  const trackerContext = stateTrackerContext || new StateTrackerContext();

  const internalKeys = [
    TRACKER,
    PATH_TRACKER,
    'enter',
    'strictEnter',
    'leave',
    'getContext',
    'relink',
    'unlink',
    'hydrate',
    'peek',
    'getTracker',
  ];

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
        let trackerMask = tracker._mask;
        let retryProxy = null;

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
          value = base[prop];
          baseTracker._isStrictPeeking = false;
          // childProxyTracker = baseTracker;
        } else {
          value = base[prop];
        }

        // refer to test case:
        //   If retryProxy exist, childProxies[prop] base should be update
        if (retryProxy) {
          if (childProxies[prop]) {
            // TODO: will cause basic example render list failed.
            childProxies[prop].getTracker()._base = value;
          }
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
            // if (tracker._context)
            //   childProxyTracker.setContext(tracker._context);
            childProxy.getTracker()._mask = trackerMask;
            return childProxy;
          }
        }

        if (isObject(value) && value.getTracker) {
          const focusKey = value.getTracker()._focusKey;
          if (focusKeyToTrackerMap[focusKey]) {
            childProxyTracker = focusKeyToTrackerMap[focusKey].getTracker();
          }
        }

        const focusKey = `focus_${prop}`;
        // const focusKey = generateRandomFocusKey();

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
            context: tracker._context,
            focusKey,
            mask: trackerMask,
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

  // // Tracker is just like an assistant, it could be reused.
  // // However, Tracker node should be created as a new now after call of enter context.
  // if (mayReusedTracker) {
  //   // baseValue should be update on each time or `childProxyBase === value` will
  //   // be always false.
  //   mayReusedTracker.update(state);
  // }

  let nextState = state;

  if (state.getTracker) {
    nextState = state.getTracker()._base;
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
      context,
      lastUpdateAt: Date.now(),
      focusKey,
      mask,
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
  createHiddenProperty(proxy, 'getTracker', function(this: IStateTracker) {
    return this[TRACKER];
  });
  createHiddenProperty(proxy, 'getPathTracker', function(this: IStateTracker) {
    return this[PATH_TRACKER];
  });

  return proxy as IStateTracker;
}

export { produce };
