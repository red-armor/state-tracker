import { PATH_TRACKER, generateRandomContextKey, TRACKER } from './commons';
import { IStateTracker, RelinkValue } from './types';
import { createPlainTrackerObject } from './StateTracker';
import { produce as ES6Produce } from './proxy';

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

  relink: function(proxy: IStateTracker, path: Array<string>, value: any) {
    const tracker = proxy[TRACKER];
    const stateContext = tracker._stateTrackerContext;
    stateContext.updateTime();
    const copy = path.slice();
    const last = copy.pop();
    const front = copy;
    const parentState = this.peek(proxy, front);
    parentState[last!] = value;
  },

  batchRelink: function(proxy: IStateTracker, values: Array<RelinkValue>) {
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

    const proxyStateCopy = ES6Produce(
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

    values.forEach(({ path, value }) => {
      this.relink(proxy, path, value);
      // unchanged object's proxy object will be preserved.
      delete childProxies[path[0]];
    });

    newTracker._childProxies = childProxies;

    return proxyStateCopy;
  },
};

export default StateTrackerUtil;
