import { createHiddenProperty } from './commons';
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
    useRevoke,
    useScope,
  }: ProxyStateTrackerConstructorProps
) {
  createHiddenProperty(this, 'id', `ProxyStateTracker_${count++}`) // eslint-disable-line

  createHiddenProperty(this, 'accessPath', accessPath);
  createHiddenProperty(this, 'rootPath', rootPath);
  createHiddenProperty(
    this,
    'type',
    Array.isArray(base) ? Type.Array : Type.Object
  );
  createHiddenProperty(this, 'base', base);

  createHiddenProperty(this, 'parentProxy', parentProxy);
  createHiddenProperty(this, 'childProxies', {} as any);

  createHiddenProperty(this, 'isPeeking', false);
  createHiddenProperty(this, 'propProperties', [] as any);
  createHiddenProperty(this, 'paths', [] as any);

  createHiddenProperty(this, 'useRevoke', useRevoke);
  createHiddenProperty(this, 'useScope', useScope);
  // function constructor https://stackoverflow.com/a/43624326/2006805
} as any) as ProxyStateTrackerConstructor;

export default ProxyStateTracker;
