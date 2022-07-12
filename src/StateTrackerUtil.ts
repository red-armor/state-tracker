import {
  raw,
  TRACKER,
  pathEqual,
  isTrackable,
  shallowCopy,
  isPlainObject,
  generateRandomContextKey,
  isProxy,
  buildCachedProxyPath,
} from './commons';
import {
  State,
  NextState,
  EntityType,
  EqualityToken,
  IStateTracker,
  ObserverProps,
  ProduceProxyOptions,
  // StateTrackerProperties,
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

  peekValue: function(
    proxyState: IStateTracker | NextState,
    key: string | number
  ) {
    if (isTrackable(proxyState)) {
      const tracker = (proxyState as IStateTracker)[TRACKER];
      if (tracker) {
        tracker._isPeeking = true;
        const nextProxy = proxyState[key];
        tracker._isPeeking = false;
        return nextProxy;
      }
    }
    return proxyState[key];
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
  }) {
    const { key, currentValue, nextValue } = options;
    const rawNewValue = raw(nextValue);
    const rawCurrentValue = raw(currentValue);
    const token = this.createEqualityToken({
      key,
      nextValue,
      currentValue,
    });

    if (rawNewValue !== rawCurrentValue) {
      if (this.hasTracker(currentValue)) {
        const currentTracker = StateTrackerUtil.getTracker(currentValue);
        const context = currentTracker._stateTrackerContext;
        const path = currentTracker._accessPath.slice();
        const affectedKey = this.generateAffectedPathKey(path);
        const derivedValue = context.getCachedProxy(affectedKey, rawNewValue);
        if (derivedValue === currentValue) {
          return token;
        }
      }
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
    // const derivedValueMap = reaction.getDerivedValueMap();
    const token = this.createEqualityToken();

    const nextGraphMap =
      graphMap ||
      (type === 'state'
        ? reaction._stateTrackerNode.stateGraphMap
        : reaction._stateTrackerNode.propsGraphMap);

    if (stateCompareLevel) {
      for (const [key, graph] of nextGraphMap.entries()) {
        const affectedPath = graph.getPath();
        const affectedKey = this.generateAffectedPathKey(affectedPath);
        const currentValue = affects.get(affectedKey);
        if (!isTrackable(nextValue) || reaction.hasPassingProps(currentValue)) {
          const token = this.resolveEqualityToken({
            key,
            currentValue: currentValue,
            nextValue: nextValue,
            // derivedValueMap,
          });
          if (!token.isEqual) return token;
        } else {
          const newValue = StateTrackerUtil.peekValue(nextValue, key);
          const token = this.isEqual(newValue, reaction, {
            type,
            stateCompareLevel: stateCompareLevel - 1,
            graphMap: graph.childrenMap,
          });
          if (!token.isEqual) return token;
        }
      }
      return token;
    }

    // @ts-ignore
    for (const [key, graph] of nextGraphMap.entries()) {
      const affectedPath = graph.getPath();
      const affectedKey = this.generateAffectedPathKey(affectedPath);
      const currentValue = affects.get(affectedKey);
      if (!isTrackable(nextValue))
        return this.createEqualityToken({
          key,
          nextValue,
          currentValue,
        });
      const newValue = StateTrackerUtil.peekValue(nextValue, key);

      if (!shallowEqual) {
        if (!graph.childrenMap.size || reaction.hasPassingProps(currentValue)) {
          const token = this.resolveEqualityToken({
            key,
            currentValue: currentValue,
            nextValue: newValue,
            // derivedValueMap,
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
          // derivedValueMap,
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
    stateTrackerContext,
    nextAccessPath,
    proxy,
    rootPath,
    createProxy,
  }: {
    value: any;
    rootPath: Array<string>;
    proxy: IStateTracker;
    nextAccessPath: Array<string | number>;
    stateTrackerContext: StateTrackerContext;
    createProxy: (state: State, options: ProduceProxyOptions) => IStateTracker;
  }) {
    if (!isTrackable(value)) {
      return value;
    }
    const path = buildCachedProxyPath(nextAccessPath.slice(0, -1));
    const isProxyValue = isProxy(value);

    if (isProxyValue) {
      const tracker = StateTrackerUtil.getTracker(value);
      if (
        pathEqual(nextAccessPath.slice(0, 1), tracker._accessPath.slice(0, 1))
      ) {
        return value;
      }
    }

    const rawValue = raw(value);

    const cachedProxy = stateTrackerContext.getCachedProxy(path, rawValue);

    if (cachedProxy) return cachedProxy;
    if (!isProxy(value)) {
      const next = createProxy(value, {
        accessPath: nextAccessPath.slice() as Array<string>,
        parentProxy: proxy as IStateTracker,
        rootPath,
        stateTrackerContext,
      });
      stateTrackerContext.setCachedProxy(path, value, next);
      return next;
    }

    const next = createProxy(isProxyValue ? shallowCopy(value) : value, {
      accessPath: nextAccessPath.slice() as Array<string>,
      parentProxy: proxy as IStateTracker,
      rootPath,
      stateTrackerContext,
    });

    stateTrackerContext.setCachedProxy(path, rawValue, next);
    return next;
  },
};

export default StateTrackerUtil;
