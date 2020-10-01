import { generateRemarkablePaths } from './path';

class StateTrackerNode {
  private paths: Array<Array<string>>;

  constructor() {
    this.paths = [];
  }

  reportPaths(path: Array<string>) {
    this.paths.push(path);
  }

  getRemarkable() {
    console.log('getRemarkableFullPaths');
    const processed = new WeakMap<
      IES5Tracker | IProxyTracker,
      ProxyTrackerInterface | ES5TrackerInterface
    >();

    const proxy = this // eslint-disable-line
    const tracker = proxy[TRACKER];

    // console.log('proxy ', proxy)
    // proxy is different with source belows.
    processed.set(proxy, tracker);

    const paths = tracker.paths;
    const propProperties = tracker.propProperties;
    const rootPath = tracker.rootPath;
    const internalPaths = generateRemarkablePaths(paths).map(path =>
      rootPath.concat(path)
    );

    console.log('start -');

    const external = propProperties.map((prop: PropProperty) => {
      const { path, source } = prop;
      console.log('source ', source);
      if (source) {
        const sourceTracker = processed.get(source) || source[TRACKER];
        const sourceRootPath = sourceTracker.rootPath;
        if (!processed.get(source!)) {
          processed.set(source!, sourceTracker);
        }
        return sourceRootPath.concat(path);
      }
      return [];
    });
    const externalPaths = generateRemarkablePaths(external);

    return internalPaths.concat(externalPaths);
  }
}

export default StateTrackerNode;
