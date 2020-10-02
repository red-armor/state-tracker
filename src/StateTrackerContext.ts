import StateTrackerNode from './StateTrackerNode';

class StateTrackerContext {
  private queue: Array<StateTrackerNode>;

  constructor() {
    this.queue = [];
  }

  enter() {
    const node = new StateTrackerNode();
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
    console.log('this. queue', this.queue);
    return this.queue[length - 1];
  }
}

export default StateTrackerContext;
