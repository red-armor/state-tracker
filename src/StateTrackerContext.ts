import StateTrackerNode from './StateTrackerNode';
import { generateRandomKey } from './commons';
import {
  ProxyCache,
  StateTrackerContextProps,
} from './types/stateTrackerContext';
import { IStateTracker } from '.';

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

  enter(context?: string) {
    const node = new StateTrackerNode(context);
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
