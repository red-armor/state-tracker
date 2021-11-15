import { isPlainObject, isTrackable, raw } from './commons';
import { ObserverProps, NextState, FalsyScreenShot } from './types';
import StateTrackerUtil from './StateTrackerUtil';
import { Graph } from './Graph';
import { Reaction } from '.';
import { EqualityToken } from './types/stateTrackerNode';
class StateTrackerNode {
  public name: string;
  public stateGraphMap: Map<string, Graph> = new Map();
  private propsGraphMap: Map<string, Graph> = new Map();
  private _observerProps: ObserverProps;
  readonly _shallowEqual: boolean;
  private _listener?: Function;
  readonly _reaction?: Reaction;

  readonly _logTrace?: boolean;

  private propsRootMetaMap: Map<
    string,
    {
      path: Array<string>;
      target: object;
    }
  > = new Map();

  private _affectedPathValue: Map<string, any> = new Map();

  // For es5, proxy target may not match a value. In this condition
  // compare raw value key will be better.
  private _propsProxyToKeyMap: Map<object, string> = new Map();

  constructor({
    name,
    shallowEqual,
    props,
    listener,
    reaction,
    logTrace,
  }: {
    name: string;
    shallowEqual?: boolean;
    props?: ObserverProps;
    listener?: Function;
    reaction?: Reaction;
    logTrace?: Boolean;
  }) {
    this.name = name;
    this._shallowEqual =
      typeof shallowEqual === 'boolean' ? shallowEqual : true;
    this._observerProps = props || {};

    this._listener = listener;
    this._reaction = reaction;

    this._logTrace = !!logTrace;
    this.registerObserverProps();
  }

  registerObserverProps() {
    for (const key in this._observerProps) {
      if (this._observerProps.hasOwnProperty(key)) {
        const value = this._observerProps[key];
        if (!this._propsProxyToKeyMap.has(raw(value))) {
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

  cleanup() {
    if (this._listener) this._listener('cleanup');
    this.stateGraphMap = new Map();
    this.propsGraphMap = new Map();
    this._propsProxyToKeyMap = new Map();
    this._affectedPathValue = new Map();
    this.propsRootMetaMap = new Map();
  }

  generateAffectedPathKey(path: Array<string | number> = []) {
    return path.join('_');
  }

  isEqual(graphMap: Map<string, Graph>, key: string, nextValue: any) {
    const token = this.equalityToken();
    const graph = graphMap.get(key);
    // 证明props并没有被用到；所以，直接返回true就可以了
    if (!graph) {
      token.falsy = true;
      return token;
    }

    const childrenMap = graph.childrenMap;
    const keys = Object.keys(childrenMap);
    const len = keys.length;

    for (let idx = 0; idx < len; idx++) {
      const key = keys[idx];
      const graph = childrenMap[key];
      const newValue = nextValue[key];
      const affectedPath = graph.getPath();
      const affectedKey = this.generateAffectedPathKey(affectedPath);
      const currentValue = this._affectedPathValue.get(affectedKey);

      if (raw(newValue) !== raw(currentValue)) {
        token.falsy = false;
        token.key = key;
        token.nextValue = raw(newValue);
        token.currentValue = raw(currentValue);
        return token;
      }
    }
    return token;
  }

  setObserverProps(props?: ObserverProps) {
    this._observerProps = props || {};
    this.registerObserverProps();
  }

  equalityToken(): EqualityToken {
    return {
      key: '',
      falsy: true,
      nextValue: null,
      currentValue: null,
    };
  }

  hydrateFalsyScreenshot(
    target: FalsyScreenShot | undefined,
    token: EqualityToken,
    type: string
  ) {
    if (!isPlainObject(target) || !target) return;
    if (token.falsy) return;
    target.reactionName = this._reaction?.name;
    target.diffKey = token.key;
    target.nextValue = token.nextValue;
    target.currentValue = token.currentValue;

    if (type === 'props') {
      target.action = 'isPropsEqual';
      target.graph = this.propsGraphMap;
    }

    if (type === 'state') {
      target.action = 'isStateEqual';
      target.graph = this.stateGraphMap;
    }
  }

  // only shallow compare used props. So the root path is very important.
  isPropsEqual(nextProps: ObserverProps, falsyScreenShot?: FalsyScreenShot) {
    const nextKeys = Object.keys(nextProps || {});
    const keys = Object.keys(this._observerProps || {});
    const len = keys.length;
    if (nextKeys.length !== keys.length) return false;
    for (let idx = 0; idx < len; idx++) {
      const key = nextKeys[idx];
      const nextValue = nextProps[key];
      const value = this._observerProps[key];

      if (isTrackable(value) && isTrackable(nextValue)) {
        const equalityToken = this.isEqual(this.propsGraphMap, key, nextValue);
        if (!equalityToken.falsy) {
          this.hydrateFalsyScreenshot(falsyScreenShot, equalityToken, 'props');
          this.cleanup();
          return false;
        }
      } else if (nextValue !== value) {
        this.hydrateFalsyScreenshot(
          falsyScreenShot,
          {
            nextValue,
            currentValue: value,
            key,
            falsy: false,
          },
          'props'
        );
        this.cleanup();
        return false;
      }
    }

    this._observerProps = nextProps;
    return true;
  }

  isStateEqual(
    state: NextState,
    rootPath: Array<string> = [],
    falsyScreenShot?: FalsyScreenShot
  ) {
    const nextRootState = StateTrackerUtil.peek(state, rootPath);
    const rootPoint = rootPath[0];
    const graph = this.stateGraphMap.get(rootPoint)!;

    // 如果说没有访问过state的话，也就是graph就没有创建这个时候直接返回true就行
    if (!graph) return true;

    const equalityToken = this.isEqual(
      this.stateGraphMap,
      rootPoint,
      nextRootState
    );

    this.hydrateFalsyScreenshot(falsyScreenShot, equalityToken, 'state');
    if (!equalityToken.falsy) this.cleanup();

    return equalityToken.falsy;
  }

  isRootEqual(state: NextState) {
    for (const [key] of this.stateGraphMap.entries()) {
      const newValue = state[key];
      const currentValue = this._affectedPathValue.get(key);
      if (raw(newValue) !== raw(currentValue)) {
        return false;
      }
    }

    return true;
  }

  // 设置props root path
  attemptToUpdatePropsRootMetaInfo(target: object, path: Array<string>) {
    for (const value of this.propsRootMetaMap.values()) {
      // es5 will make value.target !== target, so raw!!!
      if (raw(value.target) === raw(target)) {
        value.path = path.slice(0, -1);
      }
    }

    return null;
  }

  track({
    target,
    path: base,
    value,
  }: {
    target: object;
    path: Array<string>;
    key: string | number;
    value: any;
  }) {
    const propsTargetKey = this._propsProxyToKeyMap.get(raw(target));
    // path will be changed, so use copy instead
    const path = base.slice();

    if (this._logTrace && this._listener) {
      this._listener({
        action: 'trace',
        propsTargetKey,
        target,
        path: path.slice(),
        value,
      });
    }

    let nextPath = path;
    // 如果是props的，需要进行特殊处理
    if (propsTargetKey) {
      if (isTrackable(value)) {
        this._propsProxyToKeyMap.set(raw(value), propsTargetKey);
      }
      this.attemptToUpdatePropsRootMetaInfo(target, path);
      const { path: rootPath } = this.propsRootMetaMap.get(propsTargetKey)!;
      nextPath = [propsTargetKey].concat(path.slice(rootPath.length));
    }

    const graphMap = !!propsTargetKey ? this.propsGraphMap : this.stateGraphMap;
    const graphMapKey = !!propsTargetKey ? propsTargetKey : nextPath[0];

    // 存储path对应的value，这个可以认为是oldValue
    const affectedPathKey = this.generateAffectedPathKey(nextPath);
    this._affectedPathValue.set(affectedPathKey, value);

    const graph = graphMap.has(graphMapKey)
      ? graphMap.get(graphMapKey)
      : graphMap.set(graphMapKey, new Graph(graphMapKey)).get(graphMapKey);
    graph?.access(nextPath);
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
}

export default StateTrackerNode;
