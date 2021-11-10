import { isTrackable, peek } from './commons';
import { ObserverProps } from './types';
import StateTrackerUtil from './StateTrackerUtil';
class Node {
  private _effects: Array<Function>;
  private _paths: Array<string>;
  private _cursor: number;

  constructor(paths: Array<string> = []) {
    this._paths = paths;
    this._effects = [];
    this._cursor = 0;
  }

  isEmpty() {
    return this._cursor + 1 > this._paths.length;
  }

  getCurrent() {
    return this._paths[this._cursor];
  }

  proceed() {
    this._cursor = this._cursor + 1;
  }

  addEffect(effect: Function) {
    this._effects.push(effect);
  }

  teardown() {
    this._effects.forEach(effect => effect());
    this._effects = [];
  }
}

class Graph {
  public childrenMap: {
    [key: string]: Graph;
  };
  private count: number;
  private slug: Array<string>;
  private _point: string;
  private _nodes: Array<Node>;

  constructor(point: string = 'root', slug: Array<string>) {
    this.childrenMap = {};
    this.slug = slug || [];
    this._point = point;
    this.count = 0;
    this._nodes = [];
  }

  // 'constructor' should not be a key...it will derivate native code..
  keyExtractor(point: string) {
    return `__${point}`;
  }

  access(node: Node) {
    try {
      if (!node.isEmpty()) {
        const point = node.getCurrent();
        const key = this.keyExtractor(point);
        if (key) {
          if (!this.childrenMap[key]) {
            this.childrenMap[key] = new Graph(point, this.slug.concat(point));
          }
          node.proceed();
          this.childrenMap[key].access(node);
        }
      } else {
        this._nodes.push(node);
      }
      node.addEffect(() => {
        this.count = this.count - 2;
      });
      this.increment();
    } catch (err) {
      console.log(err);
    }
  }

  isOccupied() {
    return this.count > 0;
  }

  increment() {
    this.count += 1;
  }

  getPath(): Array<string> {
    return this.slug;
  }

  getPoint(): string {
    return this._point;
  }

  traverse(): Array<Array<string>> {
    const keys = Object.keys(this.childrenMap);

    const len = keys.length;
    let merged = [] as Array<Array<string>>;
    for (let i = 0; i < len; i++) {
      const key = keys[i];
      const next = this.childrenMap[key];
      const childPaths = next.traverse();
      if (childPaths.length) merged = merged.concat(childPaths);
    }

    if (this.isOccupied()) {
      this.teardown();
      if (this.slug.length) merged.push(this.slug);
    }

    return merged;
  }

  teardown() {
    this._nodes.forEach(node => node.teardown());
  }
}

class StateTrackerNode {
  public name: string;
  public graph: Graph;
  private _observerPropsGraph: Map<string, Graph> = new Map();
  private _paths: Array<Array<string>>;
  private _observerProps: ObserverProps;
  private _rootMetaMap: Map<
    string,
    {
      path: Array<string>;
      target: object;
    }
  > = new Map();
  private _affectedPathValue: Map<string, any> = new Map();

  private _observerPropsProxyToKeyMap: Map<object, string> = new Map();

  constructor(name: string, observerProps?: ObserverProps) {
    this.name = name || 'default';
    this.graph = new Graph('root', []);
    this._paths = [];
    this._observerProps = observerProps || {};
    this.registerObserverProps();
  }

  registerObserverProps() {
    for (const key in this._observerProps) {
      if (this._observerProps.hasOwnProperty(key)) {
        const value = this._observerProps[key];
        if (!this._observerPropsProxyToKeyMap.has(value)) {
          // proxy should not be key
          if (value.__isProxy) {
            const tracker = StateTrackerUtil.getTracker(value);
            const base = tracker._base;
            this._observerPropsProxyToKeyMap.set(base, key);
            this._rootMetaMap.set(key, {
              target: base,
              path: [],
            });
          } else {
            this._observerPropsProxyToKeyMap.set(value, key);
            this._rootMetaMap.set(key, {
              target: value,
              path: [],
            });
          }
        }
      }
    }
  }

  generateAffectedPathKey(path: Array<string> = []) {
    return path.join('_');
  }

  isTrackablePropsEqual(key: string, nextValue: any) {
    const graph = this._observerPropsGraph.get(key);

    // 证明props并没有被用到；所以，直接返回true就可以了
    if (!graph) return true;
    const affectedPaths = graph.traverse();
    const rootPath = this._rootMetaMap.get(key)?.path || [];

    const len = affectedPaths.length;

    for (let idx = 0; idx < len; idx++) {
      const affectedPath = affectedPaths[idx];
      const affectedPathKey = this.generateAffectedPathKey(affectedPath);
      const currentValue = peek(nextValue, rootPath, affectedPath);
      const oldValue = this._affectedPathValue.get(affectedPathKey);

      if (currentValue !== oldValue) {
        return false;
      }
    }

    return true;
  }

  setObserverProps(props?: ObserverProps) {
    this._observerProps = props || {};
    this.registerObserverProps();
  }

  // only shallow compare used props. So the root path is very important.
  isPropsEqual(nextProps: ObserverProps) {
    const nextKeys = Object.keys(nextProps);
    const keys = Object.keys(this._observerProps);
    const len = keys.length;

    if (nextKeys.length !== keys.length) return false;

    for (let idx = 0; idx < len; idx++) {
      const key = nextKeys[idx];
      const nextValue = nextProps[key];
      const value = this._observerProps[key];

      if (isTrackable(value) && isTrackable(nextValue)) {
        if (!this.isTrackablePropsEqual(key, nextValue)) return false;
      } else if (nextValue !== value) {
        return false;
      }
    }

    this._observerProps = nextProps;
    return true;
  }

  findRootMeta(target: object) {
    for (const value of this._rootMetaMap.values()) {
      if (value.target === target) return value;
    }

    return null;
  }

  track({
    target,
    path,
    value,
  }: {
    target: object;
    path: Array<string>;
    key: string | number;
    value: any;
  }) {
    const propsTargetKey = this._observerPropsProxyToKeyMap.get(target);

    // value derived from props
    if (propsTargetKey) {
      if (isTrackable(value)) {
        this._observerPropsProxyToKeyMap.set(value, propsTargetKey);
      }

      // 设置root path
      const meta = this.findRootMeta(target);
      if (meta) {
        meta.path = path.slice(0, -1);
      }

      // 存储path对应的value，这个可以认为是oldValue
      const affectedPathKey = this.generateAffectedPathKey(path);
      this._affectedPathValue.set(affectedPathKey, value);

      const graph = this._observerPropsGraph.has(propsTargetKey)
        ? this._observerPropsGraph.get(propsTargetKey)
        : this._observerPropsGraph
            .set(propsTargetKey, new Graph(propsTargetKey, []))
            .get(propsTargetKey);

      const node = new Node(path);
      graph?.access(node);
      return;
    }

    // The normal perform...
    this.trackPaths(path);
  }

  trackPaths(path: Array<string>) {
    const node = new Node(path);
    this._paths.push(path);
    this.graph.access(node);
  }

  getPaths(): Array<Array<string>> {
    return this._paths;
  }

  getRemarkable() {
    return this.graph.traverse();
  }

  getObserverPropsRemarkable() {
    const result: {
      [key: string]: Array<Array<string>>;
    } = {};
    for (const [key, value] of this._observerPropsGraph.entries()) {
      result[key] = value.traverse();
    }
    return result;
  }
}

export default StateTrackerNode;
