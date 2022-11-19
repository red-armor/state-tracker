import {
  env,
  raw,
  Type,
  isProxy,
  TRACKER,
  IS_PROXY,
  arrayProtoOwnKeys,
  objectProtoOwnKeys,
  createHiddenProperty,
} from './commons';
import { createPlainTrackerObject } from './StateTracker';
import {
  State,
  ProxyCache,
  IStateTracker,
  ProduceProxyOptions,
  StateTrackerProperties,
} from './types';
import StateTrackerContext from './StateTrackerContext';
import StateTrackerUtil from './StateTrackerUtil';
import Container from './Container';

export function produceImpl(
  state: State,
  // affected?: WeakMap<object, IStateTracker>,
  proxyCache?: ProxyCache
) {
  const container = new Container({
    state,
  });
  const stateTrackerContext = new StateTrackerContext({
    proxyCache,
    // affected,
    container,
  });

  const proxy = createProxy(state, {
    stateTrackerContext,
    accessPath: [],
    rootPath: [],
  });

  return proxy;
}

export function createProxy(
  state: State,
  options: ProduceProxyOptions
): IStateTracker {
  const {
    parentProxy = null,
    accessPath = [],
    rootPath = [],
    stateTrackerContext,
  } = options || {};
  const internalKeys = [TRACKER, 'unlink'];

  const handler = {
    get: (target: IStateTracker, prop: PropertyKey, receiver: any) => {
      try {
        // https://stackoverflow.com/questions/36372611/how-to-test-if-an-object-is-a-proxy
        if (prop === IS_PROXY) return true;
        if (internalKeys.indexOf(prop as string | symbol) !== -1)
          return Reflect.get(target, prop, receiver);
        if (typeof prop === 'symbol')
          return Reflect.get(target, prop, receiver);
        let tracker = Reflect.get(target, TRACKER) as StateTrackerProperties;
        const targetType = tracker._type;

        switch (targetType) {
          case Type.Array:
            // length should be tracked
            if (prop !== 'length' && ~arrayProtoOwnKeys.indexOf(prop as any))
              return Reflect.get(target, prop, receiver);
            break;
          case Type.Object:
            if (~objectProtoOwnKeys.indexOf(prop as any))
              return Reflect.get(target, prop, receiver);
            break;
        }

        if (tracker._isStrictPeeking)
          return Reflect.get(target, prop, receiver);

        // Note: `getBase` can get the latest value, Maybe it's the dispatched value.
        // It means if you call relink to update a key's value, then we can get the
        // value here...
        // const childrenProxies = tracker._childrenProxies;

        const nextAccessPath = accessPath.concat(prop as string);
        const isPeeking = tracker._isPeeking;
        const value = StateTrackerUtil.resolveNextValue({
          value: target[prop],
          // tracker,
          stateTrackerContext,
          nextAccessPath,
          proxy,
          rootPath,
          createProxy,
        });

        if (!isPeeking) {
          if (stateTrackerContext.getCurrent()) {
            stateTrackerContext.getCurrent().track({
              target,
              key: prop,
              // isDerived,
              value: value,
              path: nextAccessPath,
            });
          }
        }

        return value;
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
      const base = tracker._base;
      const currentValue = base[prop as string];
      const childrenProxies = tracker._childrenProxies;
      // if (base === newValue) return true;
      // TODO：可能还需要查看value是不是match，万一被设置了一个ref一样，但是path不一样的怎么搞。。
      if (raw(currentValue) === raw(newValue)) return true;
      // if (StateTrackerUtil.hasTracker(newValue)) {
      //   if (base === StateTrackerUtil.getTracker(newValue)._base) return true;
      // }

      let nextValue = newValue;

      // // remove tracker if it is a tracked value
      // if (StateTrackerUtil.hasTracker(newValue)) {
      //   nextValue = StateTrackerUtil.getTracker(newValue)._base
      // }
      childrenProxies.delete(currentValue);
      return Reflect.set(target, prop, nextValue, receiver);
    },
  };

  let nextState = state;

  // should be a Proxy!!!!
  if (isProxy(state as IStateTracker)) {
    return state as IStateTracker;
  }

  let tracker: StateTrackerProperties;

  tracker = createPlainTrackerObject({
    base: nextState,
    parentProxy,
    accessPath,
    rootPath,
    stateTrackerContext,
    lastUpdateAt: Date.now(),
  });

  // use case: In React, useRef value could not be proxied.
  //           Value could be tracked, maybe it will cause a bug..
  if (!Object.isExtensible(nextState)) {
    if (env !== 'production') {
      console.warn(
        `[state-tracker]: ${nextState} is not an extensible object, So its value ` +
          `change will not be tracked`
      );
    }
    return nextState as any;
  }
  const proxy = new Proxy(nextState, handler) as IStateTracker;

  // TODO: Cannot add property x, object is not extensible
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cant_define_property_object_not_extensible
  // if property value is not extensible, it will cause error. such as a ref value..
  createHiddenProperty(proxy, TRACKER, tracker);
  createHiddenProperty(proxy, 'unlink', function (this: IStateTracker) {
    const tracker = this[TRACKER];
    return tracker._base;
  });

  return proxy as IStateTracker;
}
