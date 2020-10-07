import invariant from 'invariant';
import {
  TRACKER,
  createHiddenProperty,
  isTrackable,
  isTypeEqual,
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
  context?: string;
}

let lastUpdateAt = Date.now();

const map = {} as {
  [key: string]: any;
};

const peek = (proxyState: IProxyStateTracker, accessPath: Array<string>) => {
  return accessPath.reduce((nextProxyState, cur: string) => {
    const tracker = nextProxyState[TRACKER];
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
    context = '',
  } = options || {};

  const trackerContext = stateTrackerContext || new StateTrackerContext();

  const internalKeys = [
    TRACKER,
    'enter',
    'leave',
    'getContext',
    'relink',
    'unlink',
    'hydrate',
  ];

  const handler = {
    get: (target: IProxyStateTracker, prop: PropertyKey, receiver: any) => {
      if (internalKeys.indexOf(prop as string | symbol) !== -1)
        return Reflect.get(target, prop, receiver);

      let tracker = Reflect.get(target, TRACKER);
      let base = tracker._base;
      const childProxies = tracker.childProxies;

      const accessPath = tracker.accessPath;
      const nextAccessPath = accessPath.concat(prop as string);
      const isPeeking = tracker.isPeeking;

      if (!isPeeking) {
        if (trackerContext.getCurrent()) {
          trackerContext.getCurrent().reportPaths(nextAccessPath);
        }

        if (trackerContext.getCurrent()) {
          const stateContextNode = trackerContext.getCurrent();
          const { context } = stateContextNode;
          const internalContext = tracker._context;

          if (context !== internalContext) {
            let _proxy = target;
            let pathCopy = accessPath.slice();
            let retryPaths = [];
            let retryProxy = null;
            while (
              _proxy[TRACKER].parentProxy &&
              _proxy[TRACKER]._lastUpdateAt < lastUpdateAt
            ) {
              retryProxy = _proxy[TRACKER].parentProxy;
              const pop = pathCopy.pop();
              retryPaths.unshift(pop);

              _proxy[TRACKER]._lastUpdateAt = lastUpdateAt;
              _proxy = _proxy[TRACKER].parentProxy;
            }

            if (retryProxy) {
              tracker = peek(retryProxy, retryPaths)[TRACKER];
              base = tracker._base;
            }
          }
        }
      }

      const value = base[prop as string];

      if (!isTrackable(value)) {
        // delete childProxies[prop] if it set to unTrackable value.
        if (childProxies[prop]) delete childProxies[prop];
        return value;
      }
      const childProxy = childProxies[prop as string];

      // for rebase value, if base value change, the childProxy should
      // be replaced
      let childProxyTracker = null;

      if (childProxy) {
        childProxyTracker = childProxy[TRACKER];
        const childProxyBase = childProxyTracker._base;
        if (childProxyBase === value) {
          if (tracker._context) childProxyTracker._context = tracker._context;
          return childProxy;
        }
      }

      /**
       * To reuse already created proxy object as possible.
       * On swap condition, it may has not value
       */
      if (typeof value[TRACKER] !== 'undefined') {
        const keys = Object.keys(childProxies);
        let maybe = null;
        let i = 0;
        let matched = '';
        for (i; i < keys.length; i++) {
          if (value === childProxies[keys[i]][TRACKER]._base) {
            maybe = childProxies[keys[i]];
            matched = keys[i];
            break;
          }
        }

        const str = nextAccessPath.join(', ');
        const trackerCandidate = map[str];

        if (trackerCandidate && maybe) {
          childProxies[prop] = maybe;
          maybe[TRACKER] = trackerCandidate;
          maybe[TRACKER]._base = value;
          /**
           * pay attention, TRACKER should not be shared...
           * Reason to delete, remove -> append which may cause data conflict..
           */
          delete childProxies[matched];
          return childProxies[prop];
        }
      }

      childProxies[prop as string] = produce(
        // only new value should create new proxy object..
        // Array.isArray(value) ? value.slice() : { ...value },
        value,
        {
          accessPath: nextAccessPath,
          parentProxy: proxy as IProxyStateTracker,
          rootPath,
          useRevoke,
          useScope,
          mayReusedTracker: childProxyTracker,
          stateTrackerContext: trackerContext,
          context: tracker._context,
        }
      );

      return childProxies[prop];
    },
    set: (
      target: IProxyStateTracker,
      prop: PropertyKey,
      newValue: any,
      receiver: any
    ) => {
      const tracker = Reflect.get(target, TRACKER);
      const childProxies = tracker.childProxies;
      const base = tracker._base[prop];
      const childProxiesKeys = Object.keys(childProxies);
      const len = childProxiesKeys.length;

      if (!isTypeEqual(base, newValue) || !len) {
        tracker.childProxies = [];
        return Reflect.set(target, prop, newValue, receiver);
      }

      return Reflect.set(target, prop, newValue, receiver);
    },
  };

  // Tracker is just like an assistant, it could be reused.
  // However, Tracker node should be created as a new now after call of enter context.
  if (mayReusedTracker) {
    // baseValue should be update on each time or `childProxyBase === value` will
    // be always false.
    mayReusedTracker.update(state);
    // mayReusedTracker._context = context
  }

  const str = accessPath.join(', ');

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
      context,
      lastUpdateAt: Date.now(),
    });

  map[str] = tracker;

  const proxy = new Proxy(state, handler);

  createHiddenProperty(proxy, TRACKER, tracker);
  createHiddenProperty(proxy, 'enter', function(mark: string) {
    trackerContext.enter(mark);
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
    parentState[last!] = value;
    lastUpdateAt = Date.now();
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

export { produce };
