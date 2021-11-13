import {
  PATH_TRACKER,
  generateRandomContextKey,
  TRACKER,
  isPlainObject,
  isTrackable,
} from './commons';
import {
  IStateTracker,
  PendingRunners,
  RelinkValue,
  ObserverProps,
  NextState,
} from './types';
import { createPlainTrackerObject } from './StateTracker';
import { createProxy as createES6Proxy } from './proxy';
import collection from './collection';
import StateTrackerNode from './StateTrackerNode';

const StateTrackerUtil = {
  hasTracker: function(proxy: IStateTracker) {
    return proxy && isPlainObject(proxy) && !!proxy[TRACKER];
  },

  getTracker: function(proxy: IStateTracker) {
    return proxy[TRACKER];
  },

  getPathTracker: function(proxy: IStateTracker) {
    return proxy[PATH_TRACKER];
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
      enableRootComparison?: boolean;
      afterCallback?: Function;
    }
  ) {
    const tracker = state[TRACKER];
    const context = tracker._stateTrackerContext;
    const { container } = context;
    const { afterCallback, enableRootComparison = true } = configs || {};
    container.perform(nextState, {
      afterCallback,
      enableRootComparison,
    });
  },

  getContext: function(proxy: IStateTracker) {
    const tracker = proxy[TRACKER];
    return tracker._stateTrackerContext;
  },

  internalRelink: function(
    proxy: IStateTracker,
    path: Array<string>,
    value: any
  ): Array<PendingRunners> {
    const tracker = proxy[TRACKER];
    const stateContext = tracker._stateTrackerContext;
    stateContext.updateTime();
    const copy = path.slice();
    const last = copy.pop();
    const front = copy;
    const parentState = this.peek(proxy, front);
    const pathTree = collection.getPathTree(proxy);
    let pendingRunners = [] as Array<PendingRunners>;
    if (pathTree) {
      pendingRunners = pathTree.diff({
        path,
        value,
      });
    }
    parentState[last!] = value;
    return pendingRunners;
  },

  relink: function(proxy: IStateTracker, path: Array<string>, value: any) {
    const pendingRunners = this.internalRelink(proxy, path, value);
    pendingRunners.forEach(({ runner }) => runner.run());
  },

  batchRelink: function(proxy: IStateTracker, values: Array<RelinkValue>) {
    const createProxy = createES6Proxy;
    // const produce = canIUseProxy() ? ES6Produce : ES5Produce;
    const tracker = proxy[TRACKER];
    const pathTracker = proxy[PATH_TRACKER];
    const baseValue = Object.assign({}, tracker._base);
    const stackerTrackerContext = tracker._stateTrackerContext;

    // should create a new object....
    const newTracker = createPlainTrackerObject({
      base: baseValue,
      parentProxy: tracker._parentProxy,
      accessPath: pathTracker.getPath(),
      rootPath: tracker._rootPath,
      stateTrackerContext: stackerTrackerContext,
      lastUpdateAt: Date.now(),
    });

    const proxyStateCopy = createProxy(
      { ...baseValue },
      {
        // parentProxy: null,
        accessPath: [],
        rootPath: [],
        stateTrackerContext: stackerTrackerContext,
        isDraft: true,
      }
    );

    const childProxies = Object.assign({}, tracker._childProxies);
    let pendingRunners = [] as Array<PendingRunners>;

    values.forEach(({ path, value }) => {
      const runners = this.internalRelink(proxy, path, value);
      pendingRunners = pendingRunners.concat(runners);
      // unchanged object's proxy object will be preserved.
      delete childProxies[path[0]];
    });

    pendingRunners.forEach(({ runner }) => runner.run());

    newTracker._childProxies = childProxies;

    return proxyStateCopy;
  },
};

export default StateTrackerUtil;
