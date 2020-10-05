import invariant from 'invariant';
import {
  TRACKER,
  createHiddenProperty,
  isTrackable,
  isTypeEqual,
  isPlainObject,
  isArray,
  // diffArraySimple,
} from './commons';
import ProxyStateTracker from './ProxyStateTracker';
import { IProxyStateTracker, ProxyStateTrackerInterface } from './types';
import StateTrackerContext from './StateTrackerContext';

interface State {
  [key: string]: any;
}

interface Options {
  accessPath: Array<string>;
  parentProxy?: IProxyStateTracker;
  rootPath: Array<string>;
  useRevoke: boolean;
  useScope: boolean;
  stateTrackerContext: StateTrackerContext;
  mayReusedTracker: null | ProxyStateTrackerInterface;
}

const peek = (proxyState: IProxyStateTracker, accessPath: Array<string>) => { // eslint-disable-line
  return accessPath.reduce((nextProxyState, cur: string) => {
    const tracker = nextProxyState;
    tracker.isPeeking = true;
    const nextProxy = nextProxyState[cur];
    tracker.isPeeking = false;
    return nextProxy;
  }, proxyState);
};

function produce(state: State, options?: Options): IProxyStateTracker {
  const {
    parentProxy = null,
    accessPath = [],
    rootPath = [],
    useRevoke = false,
    useScope = false,
    stateTrackerContext,
    mayReusedTracker,
  } = options || {};

  const trackerContext = stateTrackerContext || new StateTrackerContext();

  const internalKeys = [TRACKER, 'enter', 'leave', 'getContext'];

  const handler = {
    get: (target: IProxyStateTracker, prop: PropertyKey, receiver: any) => {
      if (internalKeys.indexOf(prop as string | symbol) !== -1)
        return Reflect.get(target, prop, receiver);

      const tracker = target[TRACKER];
      const base = tracker._base;

      const accessPath = tracker.accessPath;
      const nextAccessPath = accessPath.concat(prop as string);
      const isPeeking = tracker.isPeeking;

      if (!isPeeking) {
        if (trackerContext.getCurrent())
          trackerContext.getCurrent().reportPaths(nextAccessPath);
      }
      const childProxies = tracker.childProxies;
      const value = base[prop as string];

      if (!isTrackable(value)) return value;
      const childProxy = childProxies[prop as string];

      // for rebase value, if base value change, the childProxy should
      // be replaced
      let childProxyTracker = null;
      if (childProxy) {
        childProxyTracker = childProxy[TRACKER];
        const childProxyBase = childProxyTracker._base;
        if (childProxyBase === value) return childProxy;
      }
      return (childProxies[prop as string] = produce(value, {
        accessPath: nextAccessPath,
        parentProxy: target,
        rootPath,
        useRevoke,
        useScope,
        mayReusedTracker: childProxyTracker,
        stateTrackerContext: trackerContext,
      }));
    },
  };

  // Tracker is just like an assistant, it could be reused.
  // However, Tracker node should be created as a new now after call of enter context.
  if (mayReusedTracker) {
    // baseValue should be update on each time or `childProxyBase === value` will
    // be always false.
    mayReusedTracker.update(state);
  }
  const tracker =
    mayReusedTracker ||
    new ProxyStateTracker({
      _base: state,
      parentProxy,
      accessPath,
      rootPath,
      useRevoke,
      useScope,
      stateTrackerContext: trackerContext,
    });

  const proxy = new Proxy(state, handler);

  createHiddenProperty(proxy, TRACKER, tracker);
  createHiddenProperty(proxy, 'enter', function() {
    trackerContext.enter();
  });
  createHiddenProperty(proxy, 'leave', function() {
    trackerContext.leave();
  });
  createHiddenProperty(proxy, 'getContext', function() {
    return trackerContext;
  });
  createHiddenProperty(proxy, 'relink', function(
    this: IProxyStateTracker,
    path: Array<string>,
    value: any
  ) {
    const copy = path.slice();
    const last = copy.pop();
    const front = copy;
    const parentState = peek(this, front);
    const parentTracker = parentState[TRACKER];
    parentTracker.isPeeking = true;
    const currentState = last ? parentState[last] : parentState;
    if (typeof currentState[TRACKER] === 'undefined') {
      parentState[last!] = value;
    } else {
      const currentTracker = currentState[TRACKER];
      const currentBase = currentTracker._base;
      currentTracker.isPeeking = true;
      if (isTypeEqual(value, currentBase)) {
        if (isPlainObject(value)) {
        }

        if (isArray(value)) {
        }

        parentState[last!] = value;
        parentTracker.childProxies[last!] = produce(value, {
          parentProxy: parentState,
          accessPath: front,
          rootPath: parentTracker.rootPath,
          useRevoke: parentTracker.useRevoke,
          useScope: parentTracker.useScope,
          mayReusedTracker: currentTracker,
          stateTrackerContext: currentTracker._stateTrackerContext,
        });
      }

      currentTracker.isPeeking = false;
    }
    parentTracker.isPeeking = false;
  });
  createHiddenProperty(proxy, 'unlink', function(this: IProxyStateTracker) {
    const tracker = this[TRACKER];
    return tracker._base;
  });
  createHiddenProperty(proxy, 'hydrate', function(
    this: IProxyStateTracker,
    path: Array<string>,
    value: any
  ) {
    const copy = path.slice();
    const last = copy.pop();
    const front = copy;
    const parentState = peek(this, front);
    const parentTracker = parentState[TRACKER];
    parentTracker.isPeeking = true;
    invariant(
      typeof parentState[last!] === 'undefined',
      `'hydrate' should be only used on initial stage, please ensure '${path}' is ` +
        `not defined already.`
    );
    parentState[last!] = value;
    parentTracker.isPeeking = false;
  });

  return proxy as IProxyStateTracker;
}

export default produce;
