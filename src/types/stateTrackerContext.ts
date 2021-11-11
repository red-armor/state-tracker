import Container from '../Container';
import { IStateTracker } from './stateTracker';

export type ProxyCache = WeakMap<object, IStateTracker>;

export type StateTrackerContextProps = {
  container: Container;
  proxyCache?: ProxyCache;
  affected?: any;
};
