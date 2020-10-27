import invariant from 'invariant';

import {
  peek,
  each,
  TRACKER,
  isTrackable,
  isTypeEqual,
  createHiddenProperty,
  generateTrackerMapKey,
  isObject,
} from './commons';
import StateTracker from './StateTracker';
import {
  IStateTracker,
  ProduceOptions,
  ProduceState,
  IndexType,
  RelinkValue,
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
  const shadowBase = Array.isArray(state) ? state.slice() : { ...state };

  function createES5ProxyProperty({
    target,
    prop,
    enumerable = false,
    configurable = false,
  }: {
    target: IStateTracker | ProduceState;
    prop: PropertyKey;
    enumerable: boolean;
    configurable: boolean;
  }) {
    const description = {
      enumerable,
      configurable,
      get(this: IStateTracker) {
        let tracker = this[TRACKER];
        let base = tracker.getShadowBase();
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
                base = tracker.getShadowBase();
              }
            }
          }
        }

        let value = base[prop as IndexType];
        if (isObject(value) && typeof value.getTracker !== 'undefined') {
          value = value.getTracker().getShadowBase();
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
          const childProxyBase = childProxyTracker.getShadowBase();

          if (childProxyBase === value) {
            if (tracker._context)
              childProxyTracker.setContext(tracker._context);
            return childProxy;
          } else {
            childProxyTracker =
              trackerContext.getTracker(
                generateTrackerMapKey(nextAccessPath)
              ) || null;
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
            if (childProxies[focusKey][TRACKER].getShadowBase() === value) {
              candidateProxy = childProxies[focusKey];
              matched = focusKey;
            }
          }

          if (!candidateProxy) {
            const keys = Object.keys(childProxies);
            let i = 0;
            for (i; i < keys.length; i++) {
              if (value === childProxies[keys[i]][TRACKER].getShadowBase()) {
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

            // candidateProxy[TRACKER].setShadowBase(Array.isArray(value) ? value.slice() : { ...value });

            // not work....
            candidateProxy[TRACKER].setShadowBase(value);
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
      set(this: IStateTracker, newValue: any) {
        const tracker = this[TRACKER];
        const shadowBase = tracker.getShadowBase();
        const childProxies = tracker.getChildProxies();
        const base = shadowBase[prop as string];
        const childProxiesKeys = Object.keys(childProxies);
        const len = childProxiesKeys.length;

        if (!isTypeEqual(base, newValue) || !len) {
          // childProxies should be an object! or `delete childProxies[prop as string];` may cause
          // error. such as delete `length` in array
          // https://github.com/ryuever/state-tracker/issues/5
          tracker.setChildProxies({});
        }

        if (typeof newValue === 'object' && newValue.getTracker) {
          shadowBase[prop as IndexType] = newValue.getTracker().getShadowBase();
        } else {
          shadowBase[prop as IndexType] = newValue;
        }
      },
    };

    Object.defineProperty(target, prop, description);
  }

  // Tracker is just like an assistant, it could be reused.
  // However, Tracker node should be created as a new now after call of enter context.
  if (mayReusedTracker) {
    // baseValue should be update on each time or `childProxyBase === value` will
    // be always false.
    mayReusedTracker.updateShadowBase(shadowBase);
  }

  const mapKey = generateTrackerMapKey(accessPath);

  if (Array.isArray(state)) {
    const descriptors = Object.getPrototypeOf([]);
    const keys = Object.getOwnPropertyNames(descriptors);

    const handler = (
      func: Function,
      functionContext: IStateTracker,
      lengthGetter = true
    ) =>
      function(this: IStateTracker) {
        const args = Array.prototype.slice.call(arguments) // eslint-disable-line
        if (lengthGetter) {
          const tracker = this[TRACKER];
          const accessPath = tracker.getAccessPath();
          const isPeeking = tracker.getPeeking();
          const nextAccessPath = accessPath.concat('length');

          if (!isPeeking) {
            if (trackerContext.getCurrent()) {
              trackerContext.getCurrent().reportPaths(nextAccessPath);
            }
          }
        }

        return func.apply(functionContext, args);
      };

    keys.forEach(key => {
      const func = descriptors[key];
      if (typeof func === 'function') {
        const notRemarkLengthPropKeys = ['concat', 'copyWith'];
        const remarkLengthPropKeys = [
          'concat',
          'copyWith',
          'fill',
          'find',
          'findIndex',
          'lastIndexOf',
          'pop',
          'push',
          'reverse',
          'shift',
          'unshift',
          'slice',
          'sort',
          'splice',
          'includes',
          'indexOf',
          'join',
          'keys',
          'entries',
          'forEach',
          'filter',
          'flat',
          'flatMap',
          'map',
          'every',
          'some',
          'reduce',
          'reduceRight',
        ];
        if (notRemarkLengthPropKeys.indexOf(key) !== -1) {
          createHiddenProperty(state, key, handler(func, state as any, false));
        } else if (remarkLengthPropKeys.indexOf(key) !== -1) {
          createHiddenProperty(state, key, handler(func, state as any));
        }
      }
    });
  }

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
      // shadowBase: Array.isArray(state) ? state.slice() : {...state}
      shadowBase,
    });
  trackerContext.setTracker(mapKey, tracker);
  // TODO: Cannot add property x, object is not extensible
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cant_define_property_object_not_extensible
  // if property value is not extensible, it will cause error. such as a ref value..
  createHiddenProperty(state, TRACKER, tracker);
  createHiddenProperty(state, 'getTracker', function(this: IStateTracker) {
    return this[TRACKER];
  });

  const pending = [] as Array<Function>;

  each(state as Array<any>, (prop: PropertyKey) => {
    const value = state[prop as IndexType];

    if (isObject(value) && value.getTracker) {
      const tracker = value.getTracker();
      // const accessPath = tracker.getAccessPath()
      const trackerPath = accessPath.concat(prop as string);
      const trackerKey = generateTrackerMapKey(trackerPath);

      const candidateTracker = trackerContext.getTracker(trackerKey);
      if (candidateTracker && tracker && candidateTracker !== tracker) {
        createHiddenProperty(value, TRACKER, candidateTracker);
        const shadowBase = tracker.getShadowBase();
        pending.push(() => {
          candidateTracker.setShadowBase(shadowBase);
        });
      }
    }
  });

  if (pending.length) {
    pending.forEach(fn => fn());
  }

  each(state as Array<any>, (prop: PropertyKey) => {
    const desc = Object.getOwnPropertyDescriptor(state, prop);
    const enumerable = desc?.enumerable || false;
    const configurable = desc?.configurable || false;

    // to avoid redefine property, such `getTracker`, `enter` etc.
    if (!configurable) return;

    createES5ProxyProperty({
      target: state,
      prop: prop,
      enumerable,
      configurable,
    });

    // if (isObject(state) && state.getTracker) {
    //   const tracker = state.getTracker();
    //   const trackedProperties = tracker.getTrackedProperties();
    //   if (trackedProperties.indexOf(prop) === -1) {
    //     createES5ProxyProperty({
    //       target: state,
    //       prop: prop,
    //       enumerable,
    //       configurable,
    //     });
    //     tracker.updateTrackedProperties(prop);
    //   }
    // }
  });

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
  createHiddenProperty(state, 'batchRelink', function(
    this: IStateTracker,
    values: Array<RelinkValue>
  ) {
    const tracker = this[TRACKER];
    const baseValue = Object.assign({}, tracker.getBase());
    const stackerTrackerContext = new StateTrackerContext();

    // should create a new object....
    const newTracker = new StateTracker({
      base: baseValue,
      parentProxy: tracker.getParentProxy(),
      accessPath: tracker.getAccessPath(),
      rootPath: tracker.getRootPath(),
      stateTrackerContext: stackerTrackerContext,
      context: tracker.getContext(),
      lastUpdateAt: Date.now(),
      focusKey: null,
    });

    const proxyStateCopy = produce(
      { ...baseValue },
      {
        // parentProxy: null,
        accessPath: [],
        rootPath: [],
        stateTrackerContext: stackerTrackerContext,
        mayReusedTracker: newTracker,
        context: tracker.getContext(),
        focusKey: null,
      }
    );

    const childProxies = Object.assign({}, tracker.getChildProxies());

    values.forEach(({ path, value }) => {
      this.relink(path, value);

      // unchanged object's proxy object will be preserved.
      delete childProxies[path[0]];
    });

    newTracker.setChildProxies(childProxies);

    return proxyStateCopy;
  });
  createHiddenProperty(state, 'unlink', function(this: IStateTracker) {
    const tracker = this[TRACKER];
    return tracker.getShadowBase();
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
