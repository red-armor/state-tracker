import {
  isPlainObject,
  isTrackable,
  raw,
  noop,
  isProxy,
  fastJoin,
} from './commons';
import {
  Activity,
  NextState,
  ChangedValue,
  ObserverProps,
  EqualityToken,
  ScreenshotToken,
  ResolveActivityTokenPayload,
} from './types';
import StateTrackerUtil from './StateTrackerUtil';
import Graph from './Graph';
import Reaction from './Reaction';
import { resolveActivityToken } from './reporter';
class StateTrackerNode {
  public name: string;
  public stateGraphMap: Map<string, Graph> = new Map();
  public propsGraphMap: Map<string, Graph> = new Map();

  private _observerProps: ObserverProps;
  // public _derivedValueMap: WeakMap<any, any> = new WeakMap();

  readonly _shallowEqual: boolean;
  readonly _reaction?: Reaction;
  public activityListener?: Function;
  public changedValueListener?: (payload: ScreenshotToken) => void;
  public logActivity: Function;
  public logChangedValue?: Function;

  private propsRootMetaMap: Map<
    string,
    {
      path: Array<string>;
      target: object;
    }
  > = new Map();

  // 存储被访问path对应的值，可以认为是old value
  public _affectedPathValue: Map<string, any> = new Map();

  // For es5, proxy target may not match a value. In this condition
  // compare raw value key will be better.
  // 为了props value能够拿到对应的props key
  // 比如 { data: { id: 1 } } 形式可以通过{id: 1} => 'data'
  private _propsProxyToKeyMap: Map<object, string> = new Map();

  constructor({
    name,
    shallowEqual,
    props,
    reaction,
    activityListener,
    changedValueListener,
  }: {
    name: string;
    shallowEqual?: boolean;
    props?: ObserverProps;
    reaction?: Reaction;
    activityListener?: Function;
    changedValueListener?: (payload: ScreenshotToken) => void;
  }) {
    this.name = name;
    this._shallowEqual =
      typeof shallowEqual === 'boolean' ? shallowEqual : true;
    this._observerProps = props || {};

    this.activityListener = activityListener;
    this.changedValueListener = changedValueListener;
    this._reaction = reaction;

    this.logActivity = this.isActivityLoggerEnabled()
      ? this._logActivity.bind(this)
      : noop;
    this.logChangedValue = this.isChangedValueLoggerEnabled()
      ? this._logChangedValue.bind(this)
      : () => {};
    this.registerObserverProps();
  }

  getReaction() {
    return this._reaction;
  }

  isActivityLoggerEnabled() {
    return typeof this.activityListener === 'function';
  }

  isChangedValueLoggerEnabled() {
    return typeof this.changedValueListener === 'function';
  }

  _logActivity<T extends Activity>(
    activity: T,
    payload?: ResolveActivityTokenPayload<T>
  ) {
    const token = resolveActivityToken<T>({
      activity,
      stateTrackerNode: this,
      payload,
    });

    this.activityListener!(token);
  }

  _logChangedValue(payload: ScreenshotToken) {
    this.changedValueListener!(payload);
  }

  registerObserverProps() {
    this.logActivity('registerProps');
    const reaction = this.getReaction();
    reaction?.getParent()?.clearPassingProps(reaction);

    for (const key in this._observerProps) {
      if (this._observerProps.hasOwnProperty(key)) {
        const value = this._observerProps[key];
        const rawValue = raw(value);
        if (isProxy(value)) {
          reaction?.getParent()?.mountPassingProps(reaction, rawValue);
        }
        if (!this._propsProxyToKeyMap.has(rawValue)) {
          // proxy should not be key
          this.setPropsProxyToKeyMapValue(rawValue, key);
          this.propsRootMetaMap.set(key, {
            target: rawValue,
            path: [],
          });
        }

        // if (!isTrackable(rawValue)) {
        //   this.__observerProps[key] = value
        //   // delete this._observerProps[key]
        //   Object.defineProperty(this._observerProps, key, {
        //     get: () => {
        //       console.log('access ===== ', key)
        //       return this.__observerProps[key]
        //     }
        //   })
        // }
        this._affectedPathValue.set(key, value);
      }
    }
  }

  getProps() {
    return this._observerProps;
  }

  getShallowEqual() {
    return !!this._shallowEqual;
  }

  setPropsProxyToKeyMapValue(value: any, key: string) {
    if (isTrackable(value)) {
      const rawValue = raw(value);
      this._propsProxyToKeyMap.set(rawValue, key);
    }
  }

  // when state changes, props derived temp Map should not be cleanup.
  // because on every rerender, props will be compared. if it's empty,
  // the propsEqual will always be true
  stateChangedCleanup() {
    // this.logActivity('cleanupStateDeps');
    // this.stateGraphMap = new Map();
    // // this._affectedPathValue is used to temp save access path value.
    // // It should be cleanup on each `false` equality !!
    // this._affectedPathValue = new Map();
    // this._reaction!.disposeFineGrainListener();
  }

  propsChangedCleanup() {
    // this.logActivity('cleanupPropsDeps');
    // this.propsGraphMap = new Map();
    // this._propsProxyToKeyMap = new Map();
    // this._affectedPathValue = new Map();
    // this.propsRootMetaMap = new Map();
  }

  cleanup() {
    this.logActivity('cleanupPropsDeps');
    this.propsGraphMap = new Map();
    this._propsProxyToKeyMap = new Map();
    this._affectedPathValue = new Map();
    this.propsRootMetaMap = new Map();

    // this.logActivity('cleanupStateDeps');
    this.stateGraphMap = new Map();
    // this._affectedPathValue is used to temp save access path value.
    // It should be cleanup on each `false` equality !!
    // this._affectedPathValue = new Map();
    this._reaction!.disposeFineGrainListener();
  }

  generateAffectedPathKey(path: Array<string | number> = []) {
    return fastJoin(path, '_');
  }

  setObserverProps(props?: ObserverProps) {
    this._observerProps = props || {};
    this.registerObserverProps();
  }

  hydrateFalsyScreenshot(
    target: ChangedValue | undefined,
    token: EqualityToken,
    type: string
  ) {
    if (
      (!isPlainObject(target) || !target) &&
      !this.isChangedValueLoggerEnabled()
    )
      return;
    if (token.isEqual) return;
    const v = (target || {}) as ScreenshotToken;

    v.reaction = this._reaction;
    v.diffKey = token.key;
    v.nextValue = token.nextValue;
    v.currentValue = token.currentValue;

    if (type === 'props') {
      v.action = 'isPropsEqual';
      v.graph = this.propsGraphMap;
    }

    if (type === 'state') {
      v.action = 'isStateEqual';
      v.graph = this.stateGraphMap;
    }

    if (this.isChangedValueLoggerEnabled()) {
      this._logChangedValue(v);
    }
  }

  // because props is not a proxy, for value
  // { a: 1, b: 3: c: {c1: 2}}; if a's value changes, 'a' will not be tracked
  // So it'd better to make props['a'] trackable.
  // TODO: currently. unused props key will be compared as well
  //       which need to be fixed for performance
  isPropsShallowEqual(
    nextProps: ObserverProps,
    options?: {
      changedValue?: ChangedValue;
      omitKeys?: Array<string>;
    }
  ) {
    const { changedValue, omitKeys = [] } = options || {};
    const currentKeys = Object.keys(this._observerProps);
    const nextKeys = Object.keys(nextProps);
    const currentKeysLength = currentKeys.length;
    const nextKeysLength = nextKeys.length;
    const equalityToken = StateTrackerUtil.createEqualityToken();

    if (currentKeysLength !== nextKeysLength) {
      equalityToken.isEqual = false;
      return equalityToken;
    }

    for (let idx = 0; idx < nextKeysLength; idx++) {
      const key = nextKeys[idx];
      if (omitKeys.indexOf(key) !== -1) continue;
      const newValue = nextProps[key];
      const currentValue = this._observerProps[key];

      if (newValue !== currentValue) {
        equalityToken.isEqual = false;
        equalityToken.key = key;
        equalityToken.nextValue = raw(newValue);
        equalityToken.currentValue = raw(currentValue);
        this.hydrateFalsyScreenshot(changedValue, equalityToken, 'props');
        this.propsChangedCleanup();
        return equalityToken;
      }
    }

    return equalityToken;
  }

  // only shallow compare used props. So the root path is very important.
  isPropsEqual(nextProps: ObserverProps, changedValue?: ChangedValue) {
    // on shallow compare, props should start from root.
    // so rootPoint set to empty string to make it work.

    if (this._shallowEqual) {
      this.logActivity('comparisonStart', { type: 'props' });
      const equalityToken = this.isPropsShallowEqual(nextProps, {
        changedValue,
      });
      this.logActivity('comparisonResult', {
        type: 'props',
        equalityToken,
      });
      this.logActivity('comparisonEnd', { type: 'props' });
      return equalityToken.isEqual;
    }
    // ！！！ Props can not perform deep equal..

    // 针对props的话，我们只能够做到部分的粒度化
    const trackerKeys = Array.from(this.propsGraphMap.keys()) || [];
    let equalityToken = this.isPropsShallowEqual(nextProps, {
      changedValue,
      omitKeys: trackerKeys,
    });

    if (equalityToken.isEqual) {
      // TODO: the following has a bug, if props's has a literal value
      //       or a plain object, it will not be tracked. for example,
      //       on parent, there is a new value {a: 1, c: { c1: 2 }}, it
      //       actually, it is not a observable object. maybe it's reasonable,
      //       the new value is not belong to proxyState, it no need to care.
      // const rootPoint = '';
      equalityToken = StateTrackerUtil.isEqual(nextProps, this._reaction!, {
        type: 'props',
        stateCompareLevel: 0,
      });
    }

    this.hydrateFalsyScreenshot(changedValue, equalityToken, 'props');
    if (!equalityToken.isEqual) this.propsChangedCleanup();

    return equalityToken.isEqual;
  }

  isStateEqual(
    nextRootState: NextState,
    stateCompareLevel: number,
    changedValue?: ChangedValue
  ) {
    this.logActivity('comparisonStart', { type: 'state' });
    const equalityToken = StateTrackerUtil.isEqual(
      nextRootState,
      this._reaction!,
      {
        type: 'state',
        stateCompareLevel,
      }
    );

    this.logActivity('comparisonResult', {
      type: 'state',
      equalityToken,
    });
    this.logActivity('comparisonEnd', { type: 'state' });
    this.hydrateFalsyScreenshot(changedValue, equalityToken, 'state');
    if (!equalityToken.isEqual) this.stateChangedCleanup();

    return equalityToken.isEqual;
  }

  // 设置props root path
  attemptToUpdatePropsRootMetaInfo(target: object, path: Array<string>) {
    // @ts-ignore
    for (const value of this.propsRootMetaMap.values()) {
      // es5 will make value.target !== target, so raw!!!
      if (raw(value.target) === raw(target)) {
        value.path = path.slice(0, -1);
      }
    }

    return null;
  }

  track({
    // key,
    value,
    target,
    path: base,
  }: {
    target: {
      [key: string]: any;
    };
    path: Array<string>;
    key: string | number;
    value: any;
  }) {
    // 如果propsTargetKey存在的话，说明我们在track一个props value
    const propsTargetKey = this._propsProxyToKeyMap.get(raw(target));
    // path will be changedValue, so use copy instead
    const path = base.slice();

    this.logActivity('track', {
      path,
      propsTargetKey,
      target,
      value,
    });

    let nextPath = path;
    // 如果是props的，需要进行特殊处理
    if (propsTargetKey) {
      this.setPropsProxyToKeyMapValue(value, propsTargetKey);
      this.attemptToUpdatePropsRootMetaInfo(target, path);
      const { path: rootPath } = this.propsRootMetaMap.get(propsTargetKey)!;

      // 相当于从数据层面将`rootPath`拿掉，比如说，['goods', 'listData', '0']通过
      // props.data传给子组件 {title: 'first'}, 假如说我们访问`title`的话，
      // path的值是['goods', 'listData', '0', 'title']，但是对于`propsGraphMap`,
      // 它的根节点是`data`, 所以我们需要将['goods', 'listData', '0']拿掉
      nextPath = [propsTargetKey].concat(path.slice(rootPath.length));
    }

    // 记录到底是属于props的依赖还是state的依赖
    const graphMap = !!propsTargetKey ? this.propsGraphMap : this.stateGraphMap;
    const graphMapKey = !!propsTargetKey ? propsTargetKey : nextPath[0];
    if (!propsTargetKey) {
      this._reaction?.registerFineGrainListener(graphMapKey);
    }
    // 存储path对应的value，这个可以认为是oldValue
    const affectedPathKey = StateTrackerUtil.generateAffectedPathKey(nextPath);
    this._affectedPathValue.set(affectedPathKey, value);

    const graph = graphMap.has(graphMapKey)
      ? graphMap.get(graphMapKey)
      : graphMap.set(graphMapKey, new Graph(graphMapKey)).get(graphMapKey);
    graph?.access(nextPath);
  }

  getAffectedPaths() {
    const result: {
      [key: string]: Array<Array<string>>;
    } = {};
    // @ts-ignore
    for (const [key, value] of this.stateGraphMap.entries()) {
      result[key] = value.getPaths();
    }
    return result;
  }
}

export default StateTrackerNode;
