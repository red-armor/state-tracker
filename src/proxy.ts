import invariant from 'invariant';
import {
  TRACKER,
  createHiddenProperty,
  isTrackable,
  isTypeEqual,
  generateTrackerMapKey,
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
  stateTrackerContext: StateTrackerContext;
  mayReusedTracker: null | ProxyStateTrackerInterface;
  context?: string;
  focusKey: string | null;
}

const peek = (proxyState: IProxyStateTracker, accessPath: Array<string>) => {
  return accessPath.reduce((nextProxyState, cur: string) => {
    const tracker = nextProxyState[TRACKER];
    tracker.setPeeking(true);
    const nextProxy = nextProxyState[cur];
    tracker.setPeeking(false);
    return nextProxy;
  }, proxyState);
};

function produce(state: State, options?: Options): IProxyStateTracker {
  const {
    parentProxy = null,
    accessPath = [],
    rootPath = [],
    stateTrackerContext,
    mayReusedTracker,
    context = '',
    focusKey = null,
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

      let tracker = Reflect.get(target, TRACKER) as ProxyStateTrackerInterface;
      let base = tracker.getBase();
      const childProxies = tracker.getChildProxies();
      const accessPath = tracker.getAccessPath();
      const nextAccessPath = accessPath.concat(prop as string);
      const isPeeking = tracker.getPeeking();

      if (!isPeeking) {
        if (trackerContext.getCurrent()) {
          trackerContext.getCurrent().reportPaths(nextAccessPath);
        }

        if (trackerContext.getCurrent()) {
          const stateContextNode = trackerContext.getCurrent();
          const { context } = stateContextNode;
          const internalContext = tracker.getContext();

          if (context !== internalContext) {
            let _proxy = target;
            let pathCopy = accessPath.slice();
            let retryPaths: Array<string> = [];
            let retryProxy = null;
            while (
              _proxy[TRACKER].getParentProxy() &&
              _proxy[TRACKER].getTime() < trackerContext.getTime()
            ) {
              retryProxy = _proxy[TRACKER].getParentProxy();
              const pop = pathCopy.pop();
              if (typeof pop !== 'undefined') retryPaths.unshift(pop);

              _proxy[TRACKER].setTime(trackerContext.getTime());
              _proxy = _proxy[TRACKER].getParentProxy();
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
        if (childProxies[prop as string]) {
          delete childProxies[prop as string];
        }
        return value;
      }
      const childProxy = childProxies[prop as string];

      // for rebase value, if base value change, the childProxy should be replaced
      let childProxyTracker = null;

      if (childProxy) {
        childProxyTracker = childProxy[TRACKER];
        const childProxyBase = childProxyTracker.getBase();
        if (childProxyBase === value) {
          if (tracker._context) childProxyTracker.setContext(tracker._context);
          return childProxy;
        }
      }

      /**
       * To reuse already created proxy object as possible.
       * On swap condition, it may has not value
       */
      if (typeof value[TRACKER] !== 'undefined') {
        const focusKey = value[TRACKER].getFocusKey();
        let candidateProxy = null;
        let matched = '';

        if (childProxies[focusKey]) {
          if (childProxies[focusKey][TRACKER].getBase() === value) {
            candidateProxy = childProxies[focusKey];
            matched = focusKey;
          }
        }

        if (!candidateProxy) {
          const keys = Object.keys(childProxies);
          let i = 0;
          for (i; i < keys.length; i++) {
            if (value === childProxies[keys[i]][TRACKER].getBase()) {
              candidateProxy = childProxies[keys[i]];
              matched = keys[i];
              break;
            }
          }
        }

        const mapKey = generateTrackerMapKey(nextAccessPath);
        const candidateTracker = trackerContext.getTracker(mapKey);

        if (candidateTracker && candidateProxy) {
          childProxies[prop as string] = candidateProxy;
          const toRemovedTracker = candidateProxy[TRACKER];
          candidateProxy[TRACKER] = candidateTracker;
          candidateProxy[TRACKER]._base = value;
          candidateTracker.setFocusKey(prop as string);
          /**
           * pay attention, TRACKER should not be shared...
           * Reason to delete, remove -> append which may cause data conflict..
           */
          const toRemovedTrackerKey = generateTrackerMapKey(
            toRemovedTracker.getAccessPath()
          );
          delete childProxies[matched];
          trackerContext.removeTracker(toRemovedTrackerKey);
          return childProxies[prop as string];
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
          mayReusedTracker: childProxyTracker,
          stateTrackerContext: trackerContext,
          context: tracker._context,
          focusKey: prop as string,
        }
      );

      return childProxies[prop as string];
    },
    set: (
      target: IProxyStateTracker,
      prop: PropertyKey,
      newValue: any,
      receiver: any
    ) => {
      const tracker = Reflect.get(
        target,
        TRACKER
      ) as ProxyStateTrackerInterface;
      const childProxies = tracker.getChildProxies();
      const base = tracker.getBase()[prop as string];
      const childProxiesKeys = Object.keys(childProxies);
      const len = childProxiesKeys.length;

      if (!isTypeEqual(base, newValue) || !len) {
        tracker.setChildProxies([]);
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
  }

  const mapKey = generateTrackerMapKey(accessPath);

  const tracker =
    mayReusedTracker ||
    new ProxyStateTracker({
      base: state,
      parentProxy,
      accessPath,
      rootPath,
      stateTrackerContext: trackerContext,
      context,
      lastUpdateAt: Date.now(),
      focusKey,
    });
  trackerContext.setTracker(mapKey, tracker);

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
    const tracker = this[TRACKER];
    const stateContext = tracker._stateTrackerContext;
    stateContext.updateTime();
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
    parentTracker.setPeeking(true);
    invariant(
      typeof parentState[last!] === 'undefined',
      `'hydrate' should be only used on initial stage, please ensure '${path}' is ` +
        `not defined already.`
    );
    parentState[last!] = value;
    parentTracker.setPeeking(false);
  });

  return proxy as IProxyStateTracker;
}

export { produce };
