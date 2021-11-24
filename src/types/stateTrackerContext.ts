import Container from '../Container';
import { IStateTracker } from './stateTracker';

export type ProxyCache = WeakMap<object, IStateTracker>;
export type ProxyNextCache = Map<string | number, ProxyCache>;

export type StateTrackerContextProps = {
  container: Container;
  proxyCache?: ProxyCache;
  proxyNextCache?: ProxyNextCache;
  affected?: any;
};
