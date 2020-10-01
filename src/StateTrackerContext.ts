import TrackerNode from './TrackerNode';

class StateTrackerContext {
  private queue: Array<TrackerNode>;

  constructor() {
    this.queue = [];
  }

  enter(trackerNode: TrackerNode) {
    this.queue.push(trackerNode);
  }

  leave() {
    this.pop();
  }

  pop() {
    return this.queue.pop();
  }

  current() {
    const length = this.queue.length;
    return this.queue[length - 1];
  }
}

export default StateTrackerContext;
