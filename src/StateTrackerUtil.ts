import {
  PATH_TRACKER,
  generateRandomContextKey,
  TRACKER,
  canIUseProxy,
} from './commons';
import { IStateTracker, PendingRunners, RelinkValue } from './types';
import { createPlainTrackerObject } from './StateTracker';
import { produce as ES6Produce } from './proxy';
import { produce as ES5Produce } from './es5';
import collection from './collection';

const StateTrackerUtil = {
  hasTracker: function(proxy: IStateTracker) {
    return !!proxy[TRACKER];
  },

  getTracker: function(proxy: IStateTracker) {
    return proxy[TRACKER];
  },

  getPathTracker: function(proxy: IStateTracker) {
    return proxy[PATH_TRACKER];
  },

  enter: function(proxy: IStateTracker, mark?: string) {
    const tracker = proxy[TRACKER];
    const contextKey = mark || generateRandomContextKey();
    const trackerContext = tracker._stateTrackerContext;
    trackerContext.enter(contextKey);
  },

  leave: function(proxy: IStateTracker) {
    const tracker = proxy[TRACKER];
    const trackerContext = tracker._stateTrackerContext;
    trackerContext.leave();
  },

  peek: function(proxyState: IStateTracker, accessPath: Array<string>) {
    return accessPath.reduce((nextProxyState, cur: string) => {
      const tracker = nextProxyState[TRACKER];
      tracker._isPeeking = true;
      const nextProxy = nextProxyState[cur];
      tracker._isPeeking = false;
      return nextProxy;
    }, proxyState);
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
    const produce = canIUseProxy() ? ES6Produce : ES5Produce;
    const tracker = proxy[TRACKER];
    const pathTracker = proxy[PATH_TRACKER];
    const baseValue = Object.assign({}, tracker._shadowBase || tracker._base);
    const stackerTrackerContext = tracker._stateTrackerContext;

    // should create a new object....
    const newTracker = createPlainTrackerObject({
      base: baseValue,
      parentProxy: tracker._parentProxy,
      accessPath: pathTracker.getPath(),
      rootPath: tracker._rootPath,
      stateTrackerContext: stackerTrackerContext,
      lastUpdateAt: Date.now(),
      focusKey: null,
    });

    const proxyStateCopy = produce(
      { ...baseValue },
      {
        // parentProxy: null,
        accessPath: [],
        rootPath: [],
        stateTrackerContext: stackerTrackerContext,
        mayReusedTracker: newTracker,
        focusKey: null,
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
