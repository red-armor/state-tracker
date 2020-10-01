import { TRACKER, createHiddenProperty, isTrackable } from './commons';
import ProxyStateTracker from './ProxyStateTracker';
import { IProxyStateTracker } from './types';
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
}

function produce(state: State, options?: Options): IProxyStateTracker {
  const {
    parentProxy = null,
    accessPath = [],
    rootPath = [],
    useRevoke = false,
    useScope = false,
    stateTrackerContext,
  } = options || {};

  const trackerContext = stateTrackerContext || new StateTrackerContext();

  const internalKeys = [TRACKER, 'enter', 'leave'];

  const handler = {
    get: (target: IProxyStateTracker, prop: PropertyKey, receiver: any) => {
      if (internalKeys.indexOf(prop as string | symbol) !== -1)
        return Reflect.get(target, prop, receiver);
      const tracker = target[TRACKER];
      const base = tracker.base;
      const accessPath = tracker.accessPath;
      const nextAccessPath = accessPath.concat(prop as string);
      const isPeeking = tracker.isPeeking;

      if (!isPeeking) {
        trackerContext.getCurrent().reportPaths(nextAccessPath);
      }
      const childProxies = tracker.childProxies;
      const value = base[prop as string];

      if (!isTrackable(value)) return value;
      const childProxy = childProxies[prop as string];

      // for rebase value, if base value change, the childProxy should
      // be replaced
      if (childProxy && childProxy.base === value) {
        return childProxy;
      }
      return (childProxies[prop as string] = produce(value, {
        accessPath: nextAccessPath,
        parentProxy: target,
        rootPath,
        useRevoke,
        useScope,
        stateTrackerContext: trackerContext,
      }));
    },
  };

  const proxy = new Proxy(state, handler);

  const tracker = new ProxyStateTracker({
    base: state,
    parentProxy,
    accessPath,
    rootPath,
    useRevoke,
    useScope,
  });

  createHiddenProperty(proxy, TRACKER, tracker);
  createHiddenProperty(proxy, 'enter', function() {
    trackerContext.enter();
  });
  createHiddenProperty(proxy, 'leave', function() {
    trackerContext.leave();
  });

  return proxy as IProxyStateTracker;
}

export default produce;
