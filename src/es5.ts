import invariant from 'invariant';

import {
  peek,
  each,
  TRACKER,
  isTrackable,
  createHiddenProperty,
  generateTrackerMapKey,
} from './commons';
import StateTracker from './StateTracker';
import {
  IStateTracker,
  ProduceOptions,
  ProduceState,
  IndexType,
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

  function createES5ProxyProperty({
    target,
    prop,
    enumerable = false,
  }: {
    target: IStateTracker | ProduceState;
    prop: PropertyKey;
    enumerable: boolean;
  }) {
    const description = {
      enumerable,
      configurable: false,
      get(this: IStateTracker) {
        let tracker = this[TRACKER];
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
              let _proxy = target as IStateTracker;
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

        let value;
        let baseTracker;
        if (typeof (baseTracker = base.getTracker()) !== 'undefined') {
          baseTracker.setStrictPeeking(true);
          value = base[prop as IndexType];
          baseTracker.setStrictPeeking(false);
        } else {
          value = base[prop as IndexType];
        }

        if (!isTrackable(value)) {
          // delete childProxies[prop] if it set to unTrackable value.
          if (childProxies[prop as string]) {
            const descriptor = Object.getOwnPropertyDescriptor(
              childProxies,
              prop
            );
            if (descriptor && descriptor.configurable)
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
            parentProxy: target as IStateTracker,
            rootPath,
            mayReusedTracker: childProxyTracker,
            stateTrackerContext: trackerContext,
            context: tracker._context,
            focusKey: prop as string,
          }
        );

        return childProxies[prop as string];
      },
    };

    Object.defineProperty(target, prop, description);
  }

  each(state as Array<any>, (prop: PropertyKey) => {
    const desc = Object.getOwnPropertyDescriptor(state, prop);
    const enumerable = desc?.enumerable || false;
    createES5ProxyProperty({
      target: state,
      prop,
      enumerable,
    });
  });

  // Tracker is just like an assistant, it could be reused.
  // However, Tracker node should be created as a new now after call of enter context.
  if (mayReusedTracker) {
    // baseValue should be update on each time or `childProxyBase === value` will
    // be always false.
    mayReusedTracker.update(state);
  }

  const mapKey = generateTrackerMapKey(accessPath);

  // if (Array.isArray(state)) {
  //   const descriptors = Object.getPrototypeOf([]);
  //   const keys = Object.getOwnPropertyNames(descriptors);

  //   const handler = (
  //     func: Function,
  //     functionContext: IES5Tracker,
  //     lengthGetter = true
  //   ) =>
  //     function(this: IES5Tracker) {
  //     const args = Array.prototype.slice.call(arguments) // eslint-disable-line
  //       this.runFn('assertRevoke');
  //       if (lengthGetter) {
  //         const accessPath = this.getProp('accessPath');
  //         const isPeeking = this.getProp('isPeeking');
  //         const nextAccessPath = accessPath.concat('length');

  //         if (!isPeeking) {
  //           if (
  //             context.trackerNode &&
  //             trackerNode.id !== context.trackerNode.id
  //           ) {
  //             const contextProxy = context.trackerNode.proxy;
  //             const propProperties = contextProxy?.getProp('propProperties');
  //             propProperties.push({
  //               path: nextAccessPath,
  //               source: trackerNode.proxy,
  //             });

  //             this.setProp('propProperties', propProperties);
  //           }
  //           this.runFn('reportAccessPath', nextAccessPath);
  //         }
  //       }

  //       return func.apply(functionContext, args);
  //     };

  //   keys.forEach(key => {
  //     const func = descriptors[key];
  //     if (typeof func === 'function') {
  //       const notRemarkLengthPropKeys = ['concat', 'copyWith'];
  //       const remarkLengthPropKeys = [
  //         'concat',
  //         'copyWith',
  //         'fill',
  //         'find',
  //         'findIndex',
  //         'lastIndexOf',
  //         'pop',
  //         'push',
  //         'reverse',
  //         'shift',
  //         'unshift',
  //         'slice',
  //         'sort',
  //         'splice',
  //         'includes',
  //         'indexOf',
  //         'join',
  //         'keys',
  //         'entries',
  //         'forEach',
  //         'filter',
  //         'flat',
  //         'flatMap',
  //         'map',
  //         'every',
  //         'some',
  //         'reduce',
  //         'reduceRight',
  //       ];
  //       if (notRemarkLengthPropKeys.indexOf(key) !== -1) {
  //         createHiddenProperty(proxy, key, handler(func, proxy, false));
  //       } else if (remarkLengthPropKeys.indexOf(key) !== -1) {
  //         createHiddenProperty(proxy, key, handler(func, proxy));
  //       }
  //     }
  //   });
  // }

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
  // TODO: Cannot add property x, object is not extensible
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cant_define_property_object_not_extensible
  // if property value is not extensible, it will cause error. such as a ref value..
  createHiddenProperty(state, TRACKER, tracker);
  createHiddenProperty(state, 'enter', function(mark: string) {
    trackerContext.enter(mark);
  });
  createHiddenProperty(state, 'leave', function() {
    trackerContext.leave();
  });
  createHiddenProperty(state, 'getContext', function() {
    return trackerContext;
  });
  createHiddenProperty(state, 'relink', function(
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
  createHiddenProperty(state, 'unlink', function(this: IStateTracker) {
    const tracker = this[TRACKER];
    return tracker.getBase();
  });
  createHiddenProperty(state, 'getTracker', function(this: IStateTracker) {
    return this[TRACKER];
  });
  createHiddenProperty(state, 'peek', function(
    this: IStateTracker,
    path: Array<string>
  ) {
    return peek(this, path);
  });
  createHiddenProperty(state, 'hydrate', function(
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

  return state as IStateTracker;
}

export { produce };
