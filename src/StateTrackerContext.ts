import StateTrackerNode from './StateTrackerNode';
import { generateRandomKey } from './commons';
import {
  ProxyCache,
  StateTrackerContextProps,
} from './types/stateTrackerContext';
import { IStateTracker, ObserverProps } from '.';

class StateTrackerContext {
  private queue: Array<StateTrackerNode>;
  private _lastUpdateAt: number;
  private _id: string;
  private proxyCache: ProxyCache;

  constructor(props: StateTrackerContextProps) {
    this.queue = [];
    this._id = generateRandomKey();
    this._lastUpdateAt = Date.now();
    this.proxyCache = props.proxyCache || new WeakMap();
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

  enter(name: string, props?: ObserverProps) {
    const node = new StateTrackerNode(name, props);
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
