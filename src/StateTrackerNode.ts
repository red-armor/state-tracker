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
  public context: string;
  public graph: Graph;
  private _paths: Array<Array<string>>;

  constructor(context?: string) {
    this.context = context || 'default';
    this.graph = new Graph('root', []);
    this._paths = [];
  }

  reportPaths(path: Array<string>) {
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
}

export default StateTrackerNode;
