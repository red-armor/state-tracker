import StateTrackerNode from './StateTrackerNode';
import { generateRandomKey, DEFAULT_CACHED_PROXY_PATH } from './commons';
import { StateTrackerContextProps } from './types/stateTrackerContext';
import { ObserverProps } from './types';
import Container from './Container';

class StateTrackerContext {
  private queue: Array<StateTrackerNode>;
  private _lastUpdateAt: number;
  private _id: string;
  private _cachedProxies: Map<string, WeakMap<any, any>>;
  readonly container: Container;

  constructor(props: StateTrackerContextProps) {
    this.queue = [];
    this._id = generateRandomKey();
    this._lastUpdateAt = Date.now();
    this._cachedProxies = new Map();
    this.container = props.container;
  }

  getId() {
    return this._id;
  }

  getCachedProxy(path: string, key: any) {
    const nextPath = path || DEFAULT_CACHED_PROXY_PATH;
    const group = this._cachedProxies.has(nextPath)
      ? this._cachedProxies.get(nextPath)
      : this._cachedProxies.set(nextPath, new WeakMap()).get(nextPath);

    return group?.get(key);
  }

  setCachedProxy(path: string, key: any, value: any) {
    const nextPath = path || DEFAULT_CACHED_PROXY_PATH;
    const group = this._cachedProxies.has(nextPath)
      ? this._cachedProxies.get(nextPath)
      : this._cachedProxies.set(nextPath, new WeakMap()).get(nextPath);

    group?.set(key, value);
  }

  enter(name: string, props?: ObserverProps) {
    const node = new StateTrackerNode({
      name,
      props,
    });
    this.queue.push(node);
  }

  enterNode(node: StateTrackerNode) {
    this.queue.push(node);
  }

  leave() {
    this.pop();
  }

  pop() {
    return this.queue.pop();
  }

  getCurrent(): StateTrackerNode {
    const length = this.queue.length;
    return this.queue[length - 1];
  }

  updateTime() {
    this._lastUpdateAt = Date.now();
  }

  getTime(): number {
    return this._lastUpdateAt;
  }
}

export default StateTrackerContext;
