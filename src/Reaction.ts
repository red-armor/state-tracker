import StateTrackerUtil from './StateTrackerUtil';
import StateTrackerNode from './StateTrackerNode';
import { generateReactionName, isPlainObject, raw } from './commons';
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
  public state: IStateTracker;
  public _stateTrackerNode: StateTrackerNode;
  private props?: ReactionProps;
  private scheduler: Function;
  public _shallowEqual: boolean = true;
  private _changedValue?: ChangedValue;

  private _stateCompareLevel: null | number = null;

  private _containerDisposer?: Function | null;
  private _parentDisposer?: Function | null;
  private _fineGrainListenerDisposer?: Function | null;
  private _affectedFineGrainKeys = new Set<string>();
  private _passingPropsSet: Set<any> = new Set();

  private _children: Array<Reaction> = [];
  private _childrenPassingPropsMap: Map<Reaction, Set<any>> = new Map();
  private _parent: Reaction | null = null;

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

    this.registerToContainer();
    this.registerToParent();
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

  getParent() {
    return this._parent;
  }

  getChangedValue() {
    return this._changedValue;
  }

  getResult() {
    return this._reactionResult;
  }

  registerToContainer() {
    const container = this.getContainer();
    this._containerDisposer = container.register(this);
  }

  registerToParent() {
    const context = StateTrackerUtil.getContext(this.state);
    const currentTrackerNode = context.getCurrent();
    const parentReaction = currentTrackerNode
      ? currentTrackerNode.getReaction()
      : null;
    if (parentReaction) {
      this._parent = parentReaction;
      this._parentDisposer = parentReaction.appendChild(this);
    }
  }

  appendChild(reaction: Reaction) {
    const index = this._children.findIndex(child => child === reaction);
    if (index === -1) {
      this._children.push(reaction);
      this._childrenPassingPropsMap.set(reaction, new Set());
    }
    return () => {
      const index = this._children.findIndex(child => child === reaction);
      if (index !== -1) {
        this._children.splice(index, 1);
        this._childrenPassingPropsMap.delete(reaction);
      }
    };
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

  mountPassingProps(childReaction: Reaction, value: any) {
    const group = this._childrenPassingPropsMap.has(childReaction)
      ? this._childrenPassingPropsMap.get(childReaction)
      : this._childrenPassingPropsMap
          .set(childReaction, new Set())
          .get(childReaction);
    group!.add(value);
  }

  clearPassingProps(childReaction: Reaction) {
    this._childrenPassingPropsMap.set(childReaction, new Set());
  }

  aggregatePassingProps() {
    // @ts-ignore
    let next = [];
    for (const value of this._childrenPassingPropsMap.values()) {
      // @ts-ignore
      next = next.concat(Array.from(value));
    }
    this._passingPropsSet = new Set(next);
  }

  hasPassingProps(value: any) {
    return this._passingPropsSet.has(raw(value));
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
    if (typeof this._containerDisposer === 'function') {
      this._containerDisposer();
      this._containerDisposer = null;
    }

    if (typeof this._parentDisposer === 'function') {
      this._parentDisposer();
      this._parentDisposer = null;
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
    this._passingPropsSet = new Set();
    StateTrackerUtil.enterNode(this.state, this._stateTrackerNode);
    const nextArgs = [...args];
    if (!nextArgs.length) nextArgs.push(this.state);
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
    this.aggregatePassingProps();
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
    this._passingPropsSet = new Set();
    StateTrackerUtil.enterNode(this.state, this._stateTrackerNode);
  }

  leave() {
    this.aggregatePassingProps();
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

    token.isEqual = this._stateTrackerNode.isStateEqual(
      state,
      stateCompareLevel_,
      this._changedValue
    );
    this._stateTrackerNode.logActivity('performComparisonEnd');
    return token;
  }

  getAffectedPaths() {
    const paths = this._stateTrackerNode.getAffectedPaths();
    return paths;
  }

  buildAffectedPathsGraph(paths: { [key: string]: Array<string> }) {
    const graphMap = new Map();

    const keys = Object.keys(paths);

    keys.forEach(graphMapKey => {
      const graph = graphMap.has(graphMapKey)
        ? graphMap.get(graphMapKey)
        : graphMap.set(graphMapKey, new Graph(graphMapKey)).get(graphMapKey);

      const p = paths[graphMapKey];
      p.forEach(path => graph?.access(path));
    });

    return graphMap;
  }

  getAffects() {
    return this._stateTrackerNode._affectedPathValue || new Map();
  }

  // getDerivedValueMap() {
  //   return this._stateTrackerNode._derivedValueMap || new WeakMap();
  // }
}

export default Reaction;
