import StateTrackerNode from './StateTrackerNode';
import { generateRandomKey } from './commons';

class StateTrackerContext {
  private queue: Array<StateTrackerNode>;
  private _lastUpdateAt: number;
  private _id: string;

  constructor() {
    this.queue = [];
    this._id = generateRandomKey();
    this._lastUpdateAt = Date.now();
  }

  getId() {
    return this._id;
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
