import { generateRemarkablePaths } from './path';

class StateTrackerNode {
  private paths: Array<Array<string>>;

  constructor() {
    this.paths = [];
  }

  getPaths() {
    return this.paths;
  }

  reportPaths(path: Array<string>) {
    this.paths.push(path);
  }

  getRemarkable() {
    const paths = generateRemarkablePaths(this.paths);
    return paths;
  }
}

export default StateTrackerNode;
