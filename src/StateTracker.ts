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
}: StateTrackerConstructorProps) {
  return {
    _id: canIUseProxy()
      ? `ProxyStateTracker_${count++}`
      : `ES5StateTracker_${count++}`,
    _useProxy: canIUseProxy(),
    _accessPath: accessPath,
    _rootPath: rootPath,
    _type: Array.isArray(base) ? Type.Array : Type.Object,
    _base: base,
    _parentProxy: parentProxy,
    _nextChildProxies: new Map(),
    _isPeeking: false,
    _isStrictPeeking: false,
    _lastUpdateAt: lastUpdateAt,
    _stateTrackerContext: stateTrackerContext,
  };
};

export { createPlainTrackerObject };
