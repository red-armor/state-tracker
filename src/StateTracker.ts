import { canIUseProxy } from './commons';
import { StateTrackerConstructorProps, Type } from './types';

let count = 0;

const createPlainTrackerObject = function({
  accessPath,
  parentProxy,
  rootPath,
  base,
  stateTrackerContext,
  lastUpdateAt,
  focusKey,
  shadowBase,
}: StateTrackerConstructorProps) {
  return {
    _id: canIUseProxy()
      ? `ProxyStateTracker_${count++}`
      : `ES5StateTracker_${count++}`,
    _useProxy: canIUseProxy(),
    _updateTimes: 0,
    _stateTrackerContext: stateTrackerContext,
    _lastUpdateAt: lastUpdateAt,
    _backwardAccessCount: 0,
    _accessPath: accessPath,
    _rootPath: rootPath,
    _type: Array.isArray(base) ? Type.Array : Type.Object,
    _base: base,
    _parentProxy: parentProxy,
    _childProxies: {},
    _focusKeyToTrackerMap: {},
    _focusKey: focusKey,
    _isPeeking: false,
    _isStrictPeeking: false,
    _shadowBase: shadowBase,
  };
};

export { createPlainTrackerObject };
