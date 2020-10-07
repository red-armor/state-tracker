import StateTrackerNode from './StateTrackerNode';
import { ProxyStateTrackerInterface } from './types';

class StateTrackerContext {
  private queue: Array<StateTrackerNode>;
  private _trackerMap: Map<string, ProxyStateTrackerInterface>;
  private _lastUpdateAt: number;

  constructor() {
    this.queue = [];
    this._trackerMap = new Map();
    this._lastUpdateAt = Date.now();
  }

  enter(mark: string) {
    const node = new StateTrackerNode(mark);
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

  setTracker(key: string, tracker: ProxyStateTrackerInterface) {
    this._trackerMap.set(key, tracker);
  }

  getTracker(key: string): ProxyStateTrackerInterface | undefined {
    return this._trackerMap.get(key);
  }

  removeTracker(key: string): boolean {
    return this._trackerMap.delete(key);
  }

  updateTime() {
    this._lastUpdateAt = Date.now();
  }

  getTime(): number {
    return this._lastUpdateAt;
  }
}

export default StateTrackerContext;
