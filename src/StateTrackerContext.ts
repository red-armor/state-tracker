import StateTrackerNode from './StateTrackerNode';
import { StateTrackerInterface } from './types';

class StateTrackerContext {
  private queue: Array<StateTrackerNode>;
  private _trackerMap: Map<string, StateTrackerInterface>;
  private _lastUpdateAt: number;

  constructor() {
    this.queue = [];
    this._trackerMap = new Map();
    this._lastUpdateAt = Date.now();
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

  setTracker(key: string, tracker: StateTrackerInterface) {
    this._trackerMap.set(key, tracker);
  }

  /**
   *
   * @param key registered tracker key
   *
   * Registered tracker should not be deleted !!!
   *
   */
  getTracker(key: string): StateTrackerInterface | undefined {
    return this._trackerMap.get(key);
  }

  updateTime() {
    this._lastUpdateAt = Date.now();
  }

  getTime(): number {
    return this._lastUpdateAt;
  }
}

export default StateTrackerContext;
