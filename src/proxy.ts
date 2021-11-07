import {
  TRACKER,
  PATH_TRACKER,
  createHiddenProperty,
  arrayProtoOwnKeys,
  objectProtoOwnKeys,
  Type,
  isTrackable,
  pathEqual,
  shallowCopy,
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

const buildKey = (index: number | string) => `_arr_${index}`;

const cachedProxies = new Map();

function produce(
  state: ProduceState,
  options?: ProduceProxyOptions
): IStateTracker {
  const {
    parentProxy = null,
    accessPath = [],
    rootPath = [],
    stateTrackerContext,
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

        let targetKey = prop;

        switch (targetType) {
          case Type.Array:
            // length should be reported
            if (prop !== 'length' && ~arrayProtoOwnKeys().indexOf(prop as any))
              return Reflect.get(target, prop, receiver);
            targetKey = buildKey(prop as any);
            break;
          case Type.Object:
            if (~objectProtoOwnKeys().indexOf(prop as any))
              return Reflect.get(target, prop, receiver);
            break;
        }

        if (tracker._isStrictPeeking)
          return Reflect.get(target, prop, receiver);

        // Note: `getBase` can get the latest value, Maybe it's the dispatched value.
        // It means if you call relink to update a key's value, then we can get the
        // value here...
        const childProxies = tracker._childProxies;
        const nextChildProxies = tracker._nextChildProxies;

        const nextAccessPath = accessPath.concat(prop as string);
        const isPeeking = tracker._isPeeking;

        if (!isPeeking) {
          if (trackerContext.getCurrent()) {
            trackerContext
              .getCurrent()
              .reportPaths(outerAccessPath.concat(prop as string));
          }
        }

        if (!isTrackable(target[prop])) return target[prop];

        if (childProxies[targetKey]) return childProxies[targetKey];
        const nextValue = target[prop];

        const cachedProxy = cachedProxies.get(nextValue);

        if (cachedProxy) {
          nextChildProxies[nextValue] = cachedProxy;
          childProxies[targetKey as string] = cachedProxy;
          return cachedProxy;
        }
        let producedChildProxy = null;

        // 被设置了一个trackedValue，这个时候会尽量用这个trackedValue
        if (StateTrackerUtil.hasTracker(nextValue)) {
          const nextValueTracker = StateTrackerUtil.getTracker(nextValue);
          if (pathEqual(nextValue, nextValueTracker._accessPath)) {
            producedChildProxy = nextValue;
          } else {
            producedChildProxy = produce(
              // only new value should create new proxy object..
              // Array.isArray(value) ? value.slice() : { ...value },
              shallowCopy(nextValue),
              {
                accessPath: nextAccessPath,
                parentProxy: proxy as IStateTracker,
                rootPath,
                stateTrackerContext: trackerContext,
              }
            );
          }
        } else {
          producedChildProxy = produce(
            // only new value should create new proxy object..
            // Array.isArray(value) ? value.slice() : { ...value },
            nextValue,
            {
              accessPath: nextAccessPath,
              parentProxy: proxy as IStateTracker,
              rootPath,
              stateTrackerContext: trackerContext,
            }
          );
        }

        childProxies[targetKey] = producedChildProxy;
        cachedProxies.set(nextValue, producedChildProxy);
        nextChildProxies.set(nextValue, producedChildProxy);

        return producedChildProxy;
      } catch (err) {
        console.log('[state-tracker] ', err);
      }
    },
    // should clean up unused...maybe delete should be listen...
    set: (
      target: IStateTracker,
      prop: PropertyKey,
      newValue: any,
      receiver: any
    ) => {
      const tracker = Reflect.get(target, TRACKER) as StateTrackerProperties;
      const base = tracker._base[prop as string];
      const childProxies = tracker._childProxies;
      const nextChildProxies = tracker._nextChildProxies;
      if (base === newValue) return true;
      // TODO：可能还需要查看value是不是match，万一被设置了一个ref一样，但是path不一样的怎么搞。。
      if (StateTrackerUtil.hasTracker(newValue)) {
        if (base === StateTrackerUtil.getTracker(newValue)._base) return true;
      }

      let nextValue = newValue;

      // // remove tracker if it is a tracked value
      // if (StateTrackerUtil.hasTracker(newValue)) {
      //   nextValue = StateTrackerUtil.getTracker(newValue)._base
      // }

      // newValue may be a trackerValue
      if (tracker._type === Type.Array) {
        delete childProxies[buildKey(prop as string)];
        nextChildProxies.delete(base);
      } else {
        delete childProxies[prop as any];
        nextChildProxies.delete(base);
      }

      return Reflect.set(target, prop, nextValue, receiver);
    },
  };

  let nextState = state;

  if (StateTrackerUtil.hasTracker(state as IStateTracker)) {
    return state as IStateTracker;
  }

  let tracker: StateTrackerProperties;

  tracker = createPlainTrackerObject({
    base: nextState,
    parentProxy,
    accessPath,
    rootPath,
    stateTrackerContext: trackerContext,
    lastUpdateAt: Date.now(),
  });

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
