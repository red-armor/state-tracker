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
    console.log('path ', this.paths);
  }

  getRemarkable() {
    const paths = generateRemarkablePaths(this.paths);
    return paths;
  }
}

export default StateTrackerNode;
