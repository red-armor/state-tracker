import StateTrackerNode from './StateTrackerNode';

class StateTrackerContext {
  private queue: Array<StateTrackerNode>;

  constructor() {
    this.queue = [];
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
}

export default StateTrackerContext;
