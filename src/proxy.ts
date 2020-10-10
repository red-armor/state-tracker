import invariant from 'invariant';
import {
  peek,
  TRACKER,
  isTrackable,
  isTypeEqual,
  createHiddenProperty,
  generateTrackerMapKey,
} from './commons';
import StateTracker from './StateTracker';
import {
  IStateTracker,
  ProduceOptions,
  ProduceState,
  StateTrackerInterface,
} from './types';
import StateTrackerContext from './StateTrackerContext';

function produce(state: ProduceState, options?: ProduceOptions): IStateTracker {
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
    'peek',
    'getTracker',
  ];

  const handler = {
    get: (target: IStateTracker, prop: PropertyKey, receiver: any) => {
      try {
        if (internalKeys.indexOf(prop as string | symbol) !== -1)
          return Reflect.get(target, prop, receiver);
        if (typeof prop === 'symbol')
          return Reflect.get(target, prop, receiver);

        let tracker = Reflect.get(target, TRACKER) as StateTrackerInterface;
        // Note: `getBase` can get the latest value, Maybe it's the dispatched value.
        // It means if you call relink to update a key's value, then we can get the
        // value here...
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
                base = tracker.getBase();
              }
            }
          }
        }

        const value = base[prop as string];

        if (!isTrackable(value)) {
          // delete childProxies[prop] if it set to unTrackable value.
          if (childProxies[prop as string]) {
            // TODO: may not be deleted.
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
            if (tracker._context)
              childProxyTracker.setContext(tracker._context);
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
            candidateProxy[TRACKER] = candidateTracker;
            candidateProxy[TRACKER].setBase(value);
            candidateTracker.setFocusKey(prop as string);
            /**
             * pay attention, TRACKER should not be shared...
             * Reason to delete, remove -> append which may cause data conflict..
             */
            delete childProxies[matched];
            return childProxies[prop as string];
          }
        }

        childProxies[prop as string] = produce(
          // only new value should create new proxy object..
          // Array.isArray(value) ? value.slice() : { ...value },
          value,
          {
            accessPath: nextAccessPath,
            parentProxy: proxy as IStateTracker,
            rootPath,
            mayReusedTracker: childProxyTracker,
            stateTrackerContext: trackerContext,
            context: tracker._context,
            focusKey: prop as string,
          }
        );

        return childProxies[prop as string];
      } catch (err) {
        console.log('[state-tracker] ', err);
      }
    },
    set: (
      target: IStateTracker,
      prop: PropertyKey,
      newValue: any,
      receiver: any
    ) => {
      const tracker = Reflect.get(target, TRACKER) as StateTrackerInterface;
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
    new StateTracker({
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

  // TODO: Cannot add property x, object is not extensible
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cant_define_property_object_not_extensible
  // if property value is not extensible, it will cause error. such as a ref value..
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
    this: IStateTracker,
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
  createHiddenProperty(proxy, 'unlink', function(this: IStateTracker) {
    const tracker = this[TRACKER];
    return tracker.getBase();
  });
  createHiddenProperty(proxy, 'getTracker', function(this: IStateTracker) {
    return this[TRACKER];
  });
  createHiddenProperty(proxy, 'peek', function(
    this: IStateTracker,
    path: Array<string>
  ) {
    return peek(this, path);
  });
  createHiddenProperty(proxy, 'hydrate', function(
    this: IStateTracker,
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

  return proxy as IStateTracker;
}

export { produce };
