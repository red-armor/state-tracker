import StateTrackerNode from './StateTrackerNode';
import { StateTrackerInterface } from './types';
import { generateRandomKey } from './commons';

class StateTrackerContext {
  private queue: Array<StateTrackerNode>;
  private _trackerMap: Map<string, StateTrackerInterface>;
  private _lastUpdateAt: number;
  private _id: string;

  constructor() {
    this.queue = [];
    this._id = generateRandomKey();
    this._trackerMap = new Map();
    this._lastUpdateAt = Date.now();
  }

  getId() {
    return this._id;
  }

  getTrackerMap(): Map<string, StateTrackerInterface> {
    return this._trackerMap;
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
