import invariant from 'invariant';
import {
  peek,
  TRACKER,
  isObject,
  isTrackable,
  isTypeEqual,
  createHiddenProperty,
  generateRandomKey,
  generateRandomContextKey,
  arrayProtoOwnKeys,
  objectProtoOwnKeys,
  Type,
} from './commons';
import StateTracker from './StateTracker';
import {
  IStateTracker,
  ProduceOptions,
  ProduceState,
  StateTrackerInterface,
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
    mask = '',
    isDraft = false,
  } = options || {};

  const trackerContext = stateTrackerContext || new StateTrackerContext();

  const internalKeys = [
    TRACKER,
    'enter',
    'strictEnter',
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
        const targetType = tracker.getType();

        switch (targetType) {
          case Type.Array:
            if (prop !== 'length' && ~arrayProtoOwnKeys().indexOf(prop))
              return Reflect.get(target, prop, receiver);
            break;
          case Type.Object:
            if (~objectProtoOwnKeys().indexOf(prop))
              return Reflect.get(target, prop, receiver);
            break;
        }

        if (tracker.getStrictPeeking())
          return Reflect.get(target, prop, receiver);

        // Note: `getBase` can get the latest value, Maybe it's the dispatched value.
        // It means if you call relink to update a key's value, then we can get the
        // value here...
        let base = tracker.getBase();
        const childProxies = tracker.getChildProxies();
        const accessPath = tracker.getAccessPath();
        const nextAccessPath = accessPath.concat(prop as string);
        const isPeeking = tracker.getPeeking();
        let trackerMask = tracker.getMask();
        let retryProxy = null;

        if (isDraft) {
        }

        // if (isDraft) {
        //   console.log('is draft handler');
        //   let value;

        //   if (isObject(base) && base.getTracker) {
        //     const baseTracker = base.getTracker();
        //     baseTracker.setStrictPeeking(true);
        //     value = base[prop];
        //     baseTracker.setStrictPeeking(false);
        //   } else {
        //     value = base[prop];
        //   }

        //   const produceChildProxy = produce(
        //     // only new value should create new proxy object..
        //     Array.isArray(value) ? value.slice() : { ...value },
        //     // value,
        //     {
        //       accessPath: nextAccessPath,
        //       parentProxy: proxy as IStateTracker,
        //       rootPath,
        //       mayReusedTracker: null,
        //       stateTrackerContext: trackerContext,
        //       context: tracker._context,
        //       focusKey: prop as string,
        //       mask: trackerMask,
        //       isDraft,
        //     }
        //   );

        //   childProxies[prop as string] = produceChildProxy;

        //   return produceChildProxy;
        // }

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
              const contextMask = trackerContext.getMask();
              // const contextTime = trackerContext.getTime();

              // console.log(
              //   '_proxy[TRACKER].getParentProxy() ',
              //   _proxy[TRACKER].getParentProxy(),
              //   _proxy[TRACKER].getMask(),
              //   contextMask
              // );
              while (
                _proxy[TRACKER].getParentProxy() &&
                _proxy[TRACKER].getMask() !== contextMask
              ) {
                retryProxy = _proxy[TRACKER].getParentProxy();
                const pop = pathCopy.pop();
                if (typeof pop !== 'undefined') retryPaths.unshift(pop);

                // _proxy[TRACKER].setMask(contextMask);
                _proxy = _proxy[TRACKER].getParentProxy();
              }

              if (retryProxy) {
                // refer to test case:
                //   Mask should be setting if retryProxy exist, it could prevent next fetch from retry again
                trackerMask = contextMask;
                tracker = peek(retryProxy, retryPaths)[TRACKER];
                base = tracker.getBase();
              }
            }
          }
        }

        let value;
        // for rebase value, if base value change, the childProxy should be replaced
        let childProxyTracker = null;
        const childProxy = childProxies[prop as string];

        if (isObject(base) && base.getTracker) {
          const baseTracker = base.getTracker();
          baseTracker.setStrictPeeking(true);
          value = base[prop];
          baseTracker.setStrictPeeking(false);
          // childProxyTracker = baseTracker;
        } else {
          value = base[prop];
        }

        // refer to test case:
        //   If retryProxy exist, childProxies[prop] base should be update
        if (retryProxy) {
          if (childProxies[prop]) {
            // TODO: will cause basic example render list failed.
            childProxies[prop].getTracker().setBase(value);
          }
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
        } else if (!childProxyTracker && childProxy) {
          childProxyTracker = childProxy[TRACKER];
          const childProxyBase = childProxyTracker.getBase();
          if (
            childProxyBase === value ||
            (isObject(value) &&
              value.getTracker &&
              childProxyBase === value.getTracker().getBase())
          ) {
            if (tracker._context)
              childProxyTracker.setContext(tracker._context);
            childProxy.getTracker().setMask(trackerMask);
            return childProxy;
          }
        }

        const produceChildProxy = produce(
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
            mask: trackerMask,
          }
        );

        childProxies[prop as string] = produceChildProxy;

        return produceChildProxy;
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
        // childProxies should be an object! or `delete childProxies[prop as string];` may cause
        // error. such as delete `length` in array
        // https://github.com/ryuever/state-tracker/issues/5
        tracker.setChildProxies({});
      }

      return Reflect.set(target, prop, newValue, receiver);
    },
  };

  const reusedSubProxies = mayReusedTracker
    ? mayReusedTracker.getChildProxies()
    : null;

  // // Tracker is just like an assistant, it could be reused.
  // // However, Tracker node should be created as a new now after call of enter context.
  // if (mayReusedTracker) {
  //   // baseValue should be update on each time or `childProxyBase === value` will
  //   // be always false.
  //   mayReusedTracker.update(state);
  // }

  let nextState = state;

  if (state.getTracker) {
    nextState = state.getTracker().getBase();
  }
  const tracker = new StateTracker({
    base: nextState,
    parentProxy,
    accessPath,
    rootPath,
    stateTrackerContext: trackerContext,
    context,
    lastUpdateAt: Date.now(),
    focusKey,
    mask,
  });
  if (reusedSubProxies) tracker.setChildProxies(reusedSubProxies);
  const proxy = new Proxy(nextState, handler) as IStateTracker;

  // TODO: Cannot add property x, object is not extensible
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cant_define_property_object_not_extensible
  // if property value is not extensible, it will cause error. such as a ref value..
  createHiddenProperty(proxy, TRACKER, tracker);
  createHiddenProperty(proxy, 'enter', function(mark: string) {
    const contextKey = mark || generateRandomContextKey();
    trackerContext.enter(contextKey);
  });
  createHiddenProperty(proxy, 'strictEnter', function(mark: string) {
    const contextKey = mark || generateRandomContextKey();
    trackerContext.enter(contextKey);
    tracker.setContext(contextKey);
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
    // proxyState?: IStateTracker
  ) {
    const tracker = this[TRACKER];
    const stateContext = tracker._stateTrackerContext;
    stateContext.setMask(generateRandomKey());
    stateContext.updateTime();
    const copy = path.slice();
    const last = copy.pop();
    const front = copy;
    const parentState = peek(this, front);
    parentState[last!] = value;
  });

  createHiddenProperty(proxy, 'batchRelink', function(
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
      mask: '',
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
        isDraft: true,
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
