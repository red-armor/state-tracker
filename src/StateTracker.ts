import { createHiddenProperty, inherit, canIUseProxy } from './commons';
import internal from './internal';
import {
  StateTrackerConstructor,
  StateTrackerConstructorProps,
  Type,
} from './types';

let count = 0;

// 'this' implicitly has type 'any'
// https://stackoverflow.com/questions/52431074/how-to-solve-this-implicitly-has-type-any-when-typescript-checking-classic
const StateTracker = (function(
  this: StateTrackerConstructor,
  {
    accessPath,
    parentProxy,
    rootPath,
    base,
    stateTrackerContext,
    context,
    lastUpdateAt,
    focusKey,
    shadowBase,
    mask,
  }: StateTrackerConstructorProps
) {
  createHiddenProperty(
    this,
    '_id',
    canIUseProxy()
      ? `ProxyStateTracker_${count++}`
      : `ES5StateTracker_${count++}`
  );
  createHiddenProperty(this, '_useProxy', canIUseProxy());
  createHiddenProperty(this, '_updateTimes', 0);
  createHiddenProperty(this, '_stateTrackerContext', stateTrackerContext);
  createHiddenProperty(this, '_context', context);
  createHiddenProperty(this, '_lastUpdateAt', lastUpdateAt);
  createHiddenProperty(this, '_backwardAccessCount', 0);
  createHiddenProperty(this, '_mask', mask);

  createHiddenProperty(this, '_accessPath', accessPath);
  createHiddenProperty(this, '_rootPath', rootPath);
  createHiddenProperty(
    this,
    '_type',
    Array.isArray(base) ? Type.Array : Type.Object
  );
  createHiddenProperty(this, '_base', base);

  createHiddenProperty(this, '_parentProxy', parentProxy);
  createHiddenProperty(this, '_childProxies', {} as any);
  createHiddenProperty(this, '_focusKeyToTrackerMap', {} as any);

  createHiddenProperty(this, '_focusKey', focusKey);

  createHiddenProperty(this, '_isPeeking', false);
  createHiddenProperty(this, '_isStrictPeeking', false);
  createHiddenProperty(this, '_shadowBase', shadowBase);
  createHiddenProperty(this, '_trackedProperties', []);
  // function constructor https://stackoverflow.com/a/43624326/2006805
} as any) as StateTrackerConstructor;

inherit(StateTracker, internal);

const createPlainTrackerObject = function({
  accessPath,
  parentProxy,
  rootPath,
  base,
  stateTrackerContext,
  context,
  lastUpdateAt,
  focusKey,
  shadowBase,
  mask,
}: StateTrackerConstructorProps) {
  return {
    _id: canIUseProxy()
      ? `ProxyStateTracker_${count++}`
      : `ES5StateTracker_${count++}`,
    _useProxy: canIUseProxy(),
    _updateTimes: 0,
    _stateTrackerContext: stateTrackerContext,
    _context: context,
    _lastUpdateAt: lastUpdateAt,
    _backwardAccessCount: 0,
    _mask: mask,
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
export default StateTracker;
