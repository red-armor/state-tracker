import { createHiddenProperty, inherit } from './commons';
import internal from './internal';
import {
  ProxyStateTrackerConstructor,
  ProxyStateTrackerConstructorProps,
  Type,
} from './types';

let count = 0;

// 'this' implicitly has type 'any'
// https://stackoverflow.com/questions/52431074/how-to-solve-this-implicitly-has-type-any-when-typescript-checking-classic
const ProxyStateTracker = (function(
  this: ProxyStateTrackerConstructor,
  {
    accessPath,
    parentProxy,
    rootPath,
    base,
    stateTrackerContext,
    context,
    lastUpdateAt,
  }: ProxyStateTrackerConstructorProps
) {
  createHiddenProperty(this, '_id', `ProxyStateTracker_${count++}`) // eslint-disable-line
  createHiddenProperty(this, '_updateTimes', 0);
  createHiddenProperty(this, '_stateTrackerContext', stateTrackerContext);
  createHiddenProperty(this, '_context', context);
  createHiddenProperty(this, '_lastUpdateAt', lastUpdateAt);

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

  createHiddenProperty(this, '_isPeeking', false);
  // function constructor https://stackoverflow.com/a/43624326/2006805
} as any) as ProxyStateTrackerConstructor;

inherit(ProxyStateTracker, internal);

export default ProxyStateTracker;
