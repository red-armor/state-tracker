import StateTrackerNode from './StateTrackerNode';
import { generateRandomKey } from './commons';
import {
  ProxyCache,
  ProxyNextCache,
  StateTrackerContextProps,
} from './types/stateTrackerContext';
import { IStateTracker, ObserverProps } from './types';
import Container from './Container';

class StateTrackerContext {
  private queue: Array<StateTrackerNode>;
  private _lastUpdateAt: number;
  private _id: string;
  // 原则上，还是先用`childrenProxies`中的值，只有当是一个被经过createProxy处理
  // 过的对象才能够放到cache里面
  private proxyCache: ProxyCache;
  private proxyNextCache: ProxyNextCache;
  readonly container: Container;

  constructor(props: StateTrackerContextProps) {
    this.queue = [];
    this._id = generateRandomKey();
    this._lastUpdateAt = Date.now();
    this.proxyCache = props.proxyCache || new WeakMap();
    this.proxyNextCache = props.proxyNextCache || new Map();
    this.container = props.container;
  }

  getId() {
    return this._id;
  }

  getCachedProxy(obj: object) {
    return this.proxyCache.get(obj);
  }

  setCachedProxy(key: object, value: IStateTracker) {
    this.proxyCache.set(key, value);
  }

  getCachedNextProxy(rootPoint: string | number, obj: object) {
    const values = this.proxyNextCache.get(rootPoint);
    if (values) return values.get(obj);
    return null;
  }

  setCachedNextProxy(
    rootPoint: string | number,
    key: object,
    value: IStateTracker
  ) {
    const values = this.proxyNextCache.has(rootPoint)
      ? this.proxyNextCache.get(rootPoint)
      : this.proxyNextCache.set(rootPoint, new WeakMap()).get(rootPoint);
    if (values) values.set(key, value);
    return true;
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
