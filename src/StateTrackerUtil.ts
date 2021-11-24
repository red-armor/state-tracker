import {
  raw,
  TRACKER,
  pathEqual,
  isTrackable,
  shallowCopy,
  isPlainObject,
  generateRandomContextKey,
} from './commons';
import {
  State,
  NextState,
  IStateTracker,
  ObserverProps,
  ProduceProxyOptions,
  StateTrackerProperties,
} from './types';
import StateTrackerContext from './StateTrackerContext';
import StateTrackerNode from './StateTrackerNode';

const StateTrackerUtil = {
  hasTracker: function(proxy: IStateTracker) {
    return proxy && isPlainObject(proxy) && !!proxy[TRACKER];
  },

  getTracker: function(proxy: IStateTracker) {
    return proxy[TRACKER];
  },

  enter: function(proxy: IStateTracker, mark?: string, props?: ObserverProps) {
    const tracker = proxy[TRACKER];
    const name = mark || generateRandomContextKey();
    const trackerContext = tracker._stateTrackerContext;
    trackerContext.enter(name, props);
  },

  enterNode: function(proxy: IStateTracker, node: StateTrackerNode) {
    const tracker = proxy[TRACKER];
    const trackerContext = tracker._stateTrackerContext;
    trackerContext.enterNode(node);
  },

  leave: function(proxy: IStateTracker) {
    const tracker = proxy[TRACKER];
    const trackerContext = tracker._stateTrackerContext;
    trackerContext.leave();
  },

  peek: function(
    proxyState: IStateTracker | NextState,
    accessPath: Array<string>
  ) {
    return accessPath.reduce((nextProxyState, cur: string) => {
      if (isTrackable(proxyState)) {
        const tracker = (nextProxyState as IStateTracker)[TRACKER];
        if (tracker) {
          tracker._isPeeking = true;
          const nextProxy = nextProxyState[cur];
          tracker._isPeeking = false;
          return nextProxy;
        }

        return nextProxyState[cur];
      }
      return proxyState;
    }, proxyState);
  },

  perform(
    state: IStateTracker,
    nextState:
      | IStateTracker
      | {
          [key: string]: any;
        },
    configs?: {
      stateCompareLevel?: number;
      afterCallback?: Function;
    }
  ) {
    const tracker = state[TRACKER];
    const context = tracker._stateTrackerContext;
    const { container } = context;
    const { afterCallback, stateCompareLevel } = configs || {};
    container.perform(nextState, {
      afterCallback,
      stateCompareLevel,
    });
  },

  getContext: function(proxy: IStateTracker) {
    const tracker = proxy[TRACKER];
    return tracker._stateTrackerContext;
  },

  resolveNextValue: function resolveNextValue({
    value,
    tracker,
    stateTrackerContext,
    nextAccessPath,
    proxy,
    rootPath,
    createProxy,
  }: {
    value: any;
    rootPath: Array<string>;
    proxy: IStateTracker;
    tracker: StateTrackerProperties;
    nextAccessPath: Array<string | number>;
    stateTrackerContext: StateTrackerContext;
    createProxy: (state: State, options: ProduceProxyOptions) => IStateTracker;
  }) {
    const nextChildProxies = tracker._nextChildProxies;
    let nextValue = value;
    if (!isTrackable(nextValue)) return nextValue;

    // used for cached key
    const rawNextValue = raw(nextValue);

    // 1. use value in nextChildProxies
    if (nextChildProxies.has(rawNextValue)) {
      nextValue = nextChildProxies.get(rawNextValue);
      return nextValue;
    }

    // 2. use value in context cached proxy
    const cachedProxy = stateTrackerContext.getCachedProxy(rawNextValue);
    const rootPoint = nextAccessPath[0];

    if (cachedProxy) {
      const cachedTracker = StateTrackerUtil.getTracker(cachedProxy);
      const cachedAccessPath = cachedTracker._accessPath;
      // const cachedRootPoint = cachedAccessPath[0];
      // For set with an proxy value, the same root should be preserved.
      if (
        pathEqual(nextAccessPath.slice(0, -1), cachedAccessPath.slice(0, -1))
      ) {
        // if (pathEqual(nextAccessPath, cachedAccessPath)) {
        //    too strictly !!! if remove an item, all the left should be re-proxy
        // if (nextAccessPath[0] === cachedAccessPath[0]) {
        //    may result in a bug!!!, for Example, set value under the same root !
        // so we only care the path except the end point !!!
        // not matched, will be placed in getCachedNextProxy...But, it still has a issue.
        // set more than once, then it may have overlap!!
        nextChildProxies.set(rawNextValue, cachedProxy);
        return cachedProxy;
      }

      const cachedNextProxy = stateTrackerContext.getCachedNextProxy(
        rootPoint,
        rawNextValue
      );
      if (cachedNextProxy) {
        const cachedNextTracker = StateTrackerUtil.getTracker(cachedNextProxy);

        if (rootPoint === cachedNextTracker._accessPath[0]) {
          nextChildProxies.set(rawNextValue, cachedNextProxy);
          nextValue = cachedNextProxy;
          return nextValue;
        }
      }

      nextValue = createProxy(
        // only new value should create new proxy object..
        // Array.isArray(value) ? value.slice() : { ...value },
        shallowCopy(nextValue),
        {
          accessPath: nextAccessPath.slice() as Array<string>,
          parentProxy: proxy as IStateTracker,
          rootPath,
          stateTrackerContext,
        }
      );

      stateTrackerContext.setCachedNextProxy(
        rootPoint,
        rawNextValue,
        nextValue
      );
      nextChildProxies.set(rawNextValue, nextValue);
      return nextValue;
    }

    // 被设置了一个trackedValue，这个时候会尽量用这个trackedValue
    if (StateTrackerUtil.hasTracker(nextValue)) {
      const nextValueTracker = StateTrackerUtil.getTracker(nextValue);
      if (!pathEqual(nextAccessPath, nextValueTracker._accessPath)) {
        nextValue = createProxy(
          // only new value should create new proxy object..
          shallowCopy(nextValue),
          {
            accessPath: nextAccessPath.slice() as Array<string>,
            parentProxy: proxy as IStateTracker,
            rootPath,
            stateTrackerContext,
          }
        );
      }
    } else {
      nextValue = createProxy(nextValue, {
        accessPath: nextAccessPath.slice() as Array<string>,
        parentProxy: proxy as IStateTracker,
        rootPath,
        stateTrackerContext,
      });
    }

    stateTrackerContext.setCachedProxy(rawNextValue, nextValue);
    nextChildProxies.set(rawNextValue, nextValue);
    return nextValue;
  },
};

export default StateTrackerUtil;
