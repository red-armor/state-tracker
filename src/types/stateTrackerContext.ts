import { IStateTracker } from './stateTracker';

export type ProxyCache = WeakMap<object, IStateTracker>;

export type StateTrackerContextProps = {
  proxyCache?: ProxyCache;
  affected?: any;
};
