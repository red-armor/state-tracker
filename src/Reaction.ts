import StateTrackerUtil from './StateTrackerUtil';
import StateTrackerNode from './StateTrackerNode';
import { generateReactionName, isPlainObject } from './commons';
import {
  ReactionProps,
  IStateTracker,
  NextState,
  ChangedValue,
  ReactionFn,
  ScreenshotToken,
} from './types';
import StateTrackerError from './StateTrackerError';
import Graph from './Graph';

class Reaction {
  private fn: ReactionFn;
  public name: string;
  private state: IStateTracker;
  private _stateTrackerNode: StateTrackerNode;
  private props?: ReactionProps;
  private scheduler: Function;
  private _shallowEqual: boolean = true;
  private _changedValue?: ChangedValue;

  private _stateCompareLevel: null | number = null;

  private _disposer?: Function | null;
  private _fineGrainListenerDisposer?: Function | null;
  private _affectedFineGrainKeys = new Set<string>();

  private _reactionResult: null | any;

  constructor(
    options: {
      fn: ReactionFn;
      name?: string;
      state: IStateTracker;
      scheduler?: Function;
      shallowEqual?: boolean;
      listener?: Function;
      changedValue?: ChangedValue;

      activityListener?: Function;
      changedValueListener?: (payload: ScreenshotToken) => void;
    },
    props?: ReactionProps
  ) {
    const {
      fn,
      name,
      state,
      scheduler,
      shallowEqual,
      changedValue,
      activityListener,
      changedValueListener,
    } = options;
    this.name = name
      ? name
      : (fn as any).displayName
      ? (fn as any).displayName
      : fn.name
      ? fn.name
      : generateReactionName();
    this.state = state;
    this._shallowEqual =
      typeof shallowEqual === 'boolean' ? shallowEqual : true;
    this._changedValue = changedValue;
    this._stateTrackerNode = new StateTrackerNode({
      reaction: this,
      name: this.name,
      shallowEqual: this._shallowEqual,
      changedValueListener,
      activityListener,
    });

    if (props && isPlainObject(props)) {
      this.initializeObserverProps(props);
    }

    this.fn = fn;
    this.scheduler = scheduler || ((fn: Function) => fn.call(this));

    this._reactionResult = null;

    this.register();
    this.dispose = this.dispose.bind(this);
    this.run = this.run.bind(this);

    // run fn with scheduler on initial.
    this.schedulerRun();
  }

  getContainer() {
    const context = StateTrackerUtil.getTracker(this.state)
      ._stateTrackerContext;
    return context.container;
  }

  getChangedValue() {
    return this._changedValue;
  }

  getResult() {
    return this._reactionResult;
  }

  register() {
    const container = this.getContainer();
    this._disposer = container.register(this);
  }

  // 当state发生变化时，尽量聚焦当前Reaction所关联的state对应的key的变化，
  // 如果不是的话，则自动忽略
  registerFineGrainListener(key: string) {
    const container = this.getContainer();
    this._fineGrainListenerDisposer = container.registerFineGrainListener(
      key,
      this
    );
    this._affectedFineGrainKeys.add(key);
  }

  resolverLogToken({
    action,
    ...rest
  }: {
    action: string;
  }): {
    reactionName: string;
    reaction: Reaction;
    action: string;
  } {
    return {
      reactionName: this.name,
      reaction: this,
      action,
      ...rest,
    };
  }

  dispose() {
    if (this._disposer) {
      this._disposer();
      this._disposer = null;
    }

    this.disposeFineGrainListener();
  }

  disposeFineGrainListener() {
    if (this._fineGrainListenerDisposer) {
      this._fineGrainListenerDisposer();
      this._fineGrainListenerDisposer = null;
    }
    this._affectedFineGrainKeys = new Set();
  }

  setStateCompareLevel(level: number) {
    this._stateCompareLevel = level;
  }

  getStateTrackerNode() {
    return this._stateTrackerNode;
  }

  run(...args: Array<any>) {
    // should not teardown, or props will cleaned two times
    // this.teardown();
    StateTrackerUtil.enterNode(this.state, this._stateTrackerNode);

    const nextArgs = [this.state, ...args];
    let result;
    if (this.props) nextArgs.push(this.props);
    try {
      this._stateTrackerNode.logActivity('trackDepsStart');
      result = this.fn.apply(this, nextArgs as any);
      this._stateTrackerNode.logActivity('trackDepsEnd');
    } catch (err) {
      this._stateTrackerNode.logActivity('trackDepsEnd');
      console.error(new StateTrackerError(`Reaction fn run with error ${err}`));
    }

    this._reactionResult = result;

    StateTrackerUtil.leave(this.state);
    return result;
  }

  teardown() {
    this._stateTrackerNode.logActivity('teardown');
    this._stateTrackerNode.stateChangedCleanup();
    this._stateTrackerNode.propsChangedCleanup();
  }

  // for state update trigger
  schedulerRun() {
    this._stateTrackerNode.logActivity('schedulerRunStart');
    const result = this.scheduler(this.run);
    this._stateTrackerNode.logActivity('schedulerRunEnd');
    return result;
  }

  enter() {
    StateTrackerUtil.enterNode(this.state, this._stateTrackerNode);
  }

  leave() {
    StateTrackerUtil.leave(this.state);
  }

  isPropsEqual(props: ReactionProps) {
    const truthy = this._stateTrackerNode.isPropsEqual(
      props,
      this._changedValue
    );

    if (!truthy) {
      // if props not equal, then tear down.
      // this.teardown();
      this.updateObserverProps(props);
    }
    return truthy;
  }

  initializeObserverProps(props: ReactionProps) {
    this.updateObserverProps(props);
  }

  updateObserverProps(props: ReactionProps) {
    this._stateTrackerNode.setObserverProps(props);
    this.props = props;
  }

  performComparison(
    state: NextState,
    options?: {
      stateCompareLevel?: number;
    }
  ): {
    reaction: Reaction;
    isEqual: boolean;
  } {
    const { stateCompareLevel = 0 } = options || {};

    const keys = Array.from(this._affectedFineGrainKeys);
    let truthy = true;
    const token = {
      reaction: this,
      isEqual: true,
    };

    const stateCompareLevel_ =
      typeof this._stateCompareLevel === 'number'
        ? this._stateCompareLevel
        : stateCompareLevel;

    this._stateTrackerNode.logActivity('performComparisonStart', {
      stateCompareLevel: stateCompareLevel_,
      affectedRootKeys: keys,
    });

    for (let idx = 0; idx < keys.length; idx++) {
      // this._stateCompareLevel === 0, which means comparison start from root.
      // const state  = {
      //    app: { list: [] },
      //    bar: { name: ''}
      // }
      // if app not equal, it will return false
      const root = ([] as Array<string>)
        .concat(keys[idx])
        .slice(0, stateCompareLevel_);
      truthy = this._stateTrackerNode.isStateEqual(
        state,
        root,
        this._changedValue
      );
      if (!truthy) {
        token.isEqual = false;
        this._stateTrackerNode.logActivity('performComparisonEnd');
        return token;
      }
    }

    this._stateTrackerNode.logActivity('performComparisonEnd');

    return token;
  }

  getAffects() {
    const graphMap = new Map();

    const paths = this._stateTrackerNode.getAffectedPaths();
    const keys = Object.keys(paths);

    keys.forEach(graphMapKey => {
      const graph = graphMap.has(graphMapKey)
        ? graphMap.get(graphMapKey)
        : graphMap.set(graphMapKey, new Graph(graphMapKey)).get(graphMapKey);

      const p = paths[graphMapKey];
      p.forEach(path => graph?.access(path));
    });

    console.log('graph ', graphMap);

    return paths;
  }
}

export default Reaction;
