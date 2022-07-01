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
  EntityType,
  EqualityToken,
  IStateTracker,
  ObserverProps,
  ProduceProxyOptions,
  StateTrackerProperties,
} from './types';
import Graph from './Graph';
import Reaction from './Reaction';
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

  setValue(
    state: IStateTracker,
    nextState:
      | IStateTracker
      | {
          [key: string]: any;
        },
    configs?: {
      stateCompareLevel?: number;
    }
  ) {
    const tracker = state[TRACKER];
    const context = tracker._stateTrackerContext;
    const { container } = context;
    const { stateCompareLevel } = configs || {};
    container.perform(nextState, {
      afterCallback: () => {
        const keys = Object.keys(nextState);
        for (let index = 0; index < keys.length; index++) {
          const key = keys[index];
          if (state[key] !== nextState[key]) state[key] = nextState[key];
        }
      },
      stateCompareLevel,
    });
  },

  createEqualityToken(
    options: {
      key?: string | number;
      isEqual?: boolean;
      nextValue?: any;
      currentValue?: any;
    } = {}
  ): EqualityToken {
    return {
      key: options.key || '',
      isEqual: !!options.isEqual || true,
      nextValue: options.nextValue || null,
      currentValue: options.currentValue || null,
    };
  },

  generateAffectedPathKey(path: Array<string | number> = []) {
    return path.join('_');
  },

  resolveEqualityToken(options: {
    key: string | number;
    currentValue: any;
    nextValue: any;
    derivedValueMap?: WeakMap<any, any>;
  }) {
    const {
      key,
      currentValue,
      nextValue,
      derivedValueMap = new WeakMap(),
    } = options;
    const rawNewValue = raw(nextValue);
    const rawCurrentValue = raw(currentValue);
    const token = this.createEqualityToken({
      key,
      nextValue,
      currentValue,
    });

    if (
      rawNewValue !== rawCurrentValue &&
      (!derivedValueMap.get(rawNewValue) ||
        (derivedValueMap.get(rawNewValue) &&
          raw(derivedValueMap.get(rawNewValue)) !== rawCurrentValue))
    ) {
      token.isEqual = false;
      token.key = key;
      token.nextValue = rawNewValue;
      token.currentValue = rawCurrentValue;
    }

    return token;
  },

  isEqual(
    nextValue: any,
    reaction: Reaction,
    options: {
      type?: EntityType;
      stateCompareLevel: number;
      graphMap?: Map<string | number, Graph>;
    }
  ): EqualityToken {
    const { type = 'state', stateCompareLevel, graphMap } = options || {};
    const shallowEqual = reaction._shallowEqual;
    const affects = reaction.getAffects();
    const derivedValueMap = reaction.getDerivedValueMap();
    const token = this.createEqualityToken();

    const nextGraphMap =
      graphMap ||
      (type === 'state'
        ? reaction._stateTrackerNode.stateGraphMap
        : reaction._stateTrackerNode.propsGraphMap);

    if (stateCompareLevel) {
      for (const [key, graph] of nextGraphMap.entries()) {
        const newValue = nextValue[key];
        const token = this.isEqual(newValue, reaction, {
          type,
          stateCompareLevel: stateCompareLevel - 1,
          graphMap: graph.childrenMap,
        });
        if (!token.isEqual) return token;
      }
      return token;
    }

    // @ts-ignore
    for (const [key, graph] of nextGraphMap.entries()) {
      const newValue = nextValue[key];

      const affectedPath = graph.getPath();
      const affectedKey = this.generateAffectedPathKey(affectedPath);
      const currentValue = affects.get(affectedKey);

      if (!shallowEqual) {
        if (!graph.childrenMap.size) {
          const token = this.resolveEqualityToken({
            key,
            currentValue: currentValue,
            nextValue: newValue,
            derivedValueMap,
          });
          if (!token.isEqual) return token;
        } else {
          const childEqualityToken = this.isEqual(newValue, reaction, {
            type,
            stateCompareLevel,
            graphMap: graph.childrenMap,
          });
          if (!childEqualityToken.isEqual) return childEqualityToken;
        }
      } else {
        const token = this.resolveEqualityToken({
          key,
          currentValue,
          nextValue: newValue,
          derivedValueMap,
        });

        if (!token.isEqual) return token;
      }
    }
    return token;
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
    const childrenProxies = tracker._childrenProxies;
    const token = {
      isDerived: false,
      value,
    };
    if (!isTrackable(token.value)) {
      return token;
    }

    // used for cached key
    const rawNextValue = raw(token.value);

    // 1. use value in childrenProxies
    if (childrenProxies.has(rawNextValue)) {
      token.value = childrenProxies.get(rawNextValue);
      return token;
    }

    // 2. use value in context cached proxy
    const cachedProxy = stateTrackerContext.getCachedProxy(rawNextValue);
    const rootPoint = nextAccessPath[0];

    if (cachedProxy) {
      const cachedTracker = StateTrackerUtil.getTracker(cachedProxy);
      const cachedAccessPath = cachedTracker._accessPath;

      // const cachedRootPoint = cachedAccessPath[0];
      // For set with an proxy value, the same root should be preserved.

      // slice(0, 1) may have performance metrics; But may cause error on dispatch

      // if (pathEqual(nextAccessPath.slice(0, 1), cachedAccessPath.slice(0, 1))) {
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
        childrenProxies.set(rawNextValue, cachedProxy);
        token.value = cachedProxy;
        return token;
      }

      const cachedNextProxy = stateTrackerContext.getCachedNextProxy(
        rootPoint,
        rawNextValue
      );

      token.isDerived = true;

      if (cachedNextProxy) {
        const cachedNextTracker = StateTrackerUtil.getTracker(cachedNextProxy);

        if (rootPoint === cachedNextTracker._accessPath[0]) {
          // childrenProxies.set(rawNextValue, cachedNextProxy);
          token.value = cachedNextProxy;
          return token;
        }
      }

      const next = createProxy(
        // only new value should create new proxy object..
        // Array.isArray(value) ? value.slice() : { ...value },
        shallowCopy(token.value),
        {
          accessPath: nextAccessPath.slice() as Array<string>,
          parentProxy: proxy as IStateTracker,
          rootPath,
          stateTrackerContext,
        }
      );
      token.value = next;

      stateTrackerContext.setCachedNextProxy(
        rootPoint,
        rawNextValue,
        token.value
      );
      // childrenProxies.set(rawNextValue, token.value);
      return token;
    }

    // 被设置了一个trackedValue，这个时候会尽量用这个trackedValue
    if (StateTrackerUtil.hasTracker(token.value)) {
      const nextValueTracker = StateTrackerUtil.getTracker(token.value);
      if (!pathEqual(nextAccessPath, nextValueTracker._accessPath)) {
        const next = createProxy(
          // only new value should create new proxy object..
          shallowCopy(token.value),
          {
            accessPath: nextAccessPath.slice() as Array<string>,
            parentProxy: proxy as IStateTracker,
            rootPath,
            stateTrackerContext,
          }
        );
        token.value = next;
      }
    } else {
      const next = createProxy(token.value, {
        accessPath: nextAccessPath.slice() as Array<string>,
        parentProxy: proxy as IStateTracker,
        rootPath,
        stateTrackerContext,
      });
      token.value = next;
    }

    stateTrackerContext.setCachedProxy(rawNextValue, token.value);
    childrenProxies.set(rawNextValue, token.value);
    return token;
  },
};

export default StateTrackerUtil;
