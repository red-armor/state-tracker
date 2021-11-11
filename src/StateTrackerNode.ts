import { isTrackable, peek, raw } from './commons';
import { ObserverProps, IStateTracker } from './types';
import StateTrackerUtil from './StateTrackerUtil';
import { Graph, Node } from './Graph';
class StateTrackerNode {
  public name: string;
  public stateGraphMap: Map<string, Graph> = new Map();
  private propsGraphMap: Map<string, Graph> = new Map();
  private _observerProps: ObserverProps;

  private propsRootMetaMap: Map<
    string,
    {
      path: Array<string>;
      target: object;
    }
  > = new Map();
  // private stateRootMetaMap: Map<
  //   string,
  //   {
  //     path: Array<string>;
  //     target: object;
  //   }
  // > = new Map();

  private _affectedPathValue: Map<string, any> = new Map();

  private _propsProxyToKeyMap: Map<object, string> = new Map();

  constructor(name: string, observerProps?: ObserverProps) {
    this.name = name || 'default';
    this._observerProps = observerProps || {};
    this.registerObserverProps();
  }

  registerObserverProps() {
    for (const key in this._observerProps) {
      if (this._observerProps.hasOwnProperty(key)) {
        const value = this._observerProps[key];
        if (!this._propsProxyToKeyMap.has(value)) {
          // proxy should not be key
          const rawValue = raw(value);
          this._propsProxyToKeyMap.set(rawValue, key);
          this.propsRootMetaMap.set(key, {
            target: rawValue,
            path: [],
          });
        }
      }
    }
  }

  generateAffectedPathKey(path: Array<string> = []) {
    return path.join('_');
  }

  isTrackablePropsEqual(key: string, nextValue: any) {
    const graph = this.propsGraphMap.get(key);

    // 证明props并没有被用到；所以，直接返回true就可以了
    if (!graph) return true;
    const affectedPaths = graph.getPaths();
    const rootPath = this.propsRootMetaMap.get(key)?.path || [];

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
    const nextKeys = Object.keys(nextProps || {});
    const keys = Object.keys(this._observerProps || {});
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

  isStateEqual(state: IStateTracker, rootPath: Array<string> = []) {
    const nextRootState = StateTrackerUtil.peek(state, rootPath);
    const rootPoint = rootPath[0];
    const graph = this.stateGraphMap.get(rootPoint)!;
    return this.performComparison(nextRootState, graph);
  }

  performComparison(values: IStateTracker | object, graph: Graph) {
    console.log('value ', values, graph);
  }

  findRootMeta(target: object) {
    for (const value of this.propsRootMetaMap.values()) {
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
    const propsTargetKey = this._propsProxyToKeyMap.get(target);

    // value derived from props
    if (propsTargetKey) {
      if (isTrackable(value)) {
        this._propsProxyToKeyMap.set(value, propsTargetKey);
      }

      // 设置root path
      const meta = this.findRootMeta(target);
      if (meta) {
        meta.path = path.slice(0, -1);
      }

      // 存储path对应的value，这个可以认为是oldValue
      const affectedPathKey = this.generateAffectedPathKey(path);
      this._affectedPathValue.set(affectedPathKey, value);

      const graph = this.propsGraphMap.has(propsTargetKey)
        ? this.propsGraphMap.get(propsTargetKey)
        : this.propsGraphMap
            .set(propsTargetKey, new Graph(propsTargetKey))
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
    const rootPoint = path[0];

    if (this.stateGraphMap.has(rootPoint)) {
      this.stateGraphMap.set(rootPoint, new Graph(rootPoint));
    }

    const graph = this.stateGraphMap.has(rootPoint)
      ? this.stateGraphMap.get(rootPoint)
      : this.stateGraphMap.set(rootPoint, new Graph(rootPoint)).get(rootPoint);
    graph!.access(node);
  }

  getStateRemarkable() {
    const result: {
      [key: string]: Array<Array<string>>;
    } = {};
    for (const [key, value] of this.stateGraphMap.entries()) {
      result[key] = value.getPaths();
    }
    return result;
  }

  getPropsRemarkable() {
    const result: {
      [key: string]: Array<Array<string>>;
    } = {};
    for (const [key, value] of this.propsGraphMap.entries()) {
      result[key] = value.getPaths();
    }
    return result;
  }

  // TODO: clear
  getRemarkable() {
    return [];
  }
}

export default StateTrackerNode;
