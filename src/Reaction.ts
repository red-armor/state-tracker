import StateTrackerNode from './StateTrackerNode';
import StateTrackerUtil from './StateTrackerUtil';
import { generateReactionName, noop } from './commons';
import {
  ReactionProps,
  IStateTracker,
  NextState,
  FalsyScreenShot,
} from './types';
import StateTrackerError from './StateTrackerError';

class Reaction {
  private fn: Function;
  public name: string;
  private state: IStateTracker;
  private stateTrackerNode: StateTrackerNode;
  private props?: ReactionProps;
  private scheduler: Function;
  private _shallowEqual: boolean = true;
  private _falsyScreenShot?: FalsyScreenShot;

  readonly _logTrace?: boolean;

  private _disposer: Function = noop;
  private _listener?: Function;

  constructor(
    options: {
      fn: Function;
      state: IStateTracker;
      scheduler?: Function;
      shallowEqual?: boolean;
      listener?: Function;
      falsyScreenShot?: FalsyScreenShot;

      // For StateTrackerNode
      logTrace?: boolean;
    },
    props?: ReactionProps
  ) {
    const {
      fn,
      logTrace,
      state,
      scheduler,
      shallowEqual,
      listener,
      falsyScreenShot,
    } = options;
    this.name = (fn as any).displayName
      ? (fn as any).displayName
      : fn.name
      ? fn.name
      : generateReactionName();
    this.state = state;
    this._shallowEqual =
      typeof shallowEqual === 'boolean' ? shallowEqual : true;
    this._listener = listener;
    this._logTrace = logTrace;
    this._falsyScreenShot = falsyScreenShot;
    this.stateTrackerNode = new StateTrackerNode({
      reaction: this,
      name: this.name,
      shallowEqual: this._shallowEqual,
      listener: this.log.bind(this),
      logTrace: this._logTrace,
    });
    this.props = props;
    this.fn = fn;
    this.scheduler = scheduler || noop;

    this.register();
    this.dispose = this.dispose.bind(this);
  }

  register() {
    const context = StateTrackerUtil.getTracker(this.state)
      ._stateTrackerContext;
    const container = context.container;

    this._disposer = container.register(this);
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

  log(
    action: string,
    extra: {
      [key: string]: any;
    } = {}
  ) {
    if (typeof this._listener === 'function') {
      const token = this.resolverLogToken({
        action,
        ...extra,
      });

      this._listener(token);
    }
  }

  dispose() {
    this._disposer();
  }

  getStateTrackerNode() {
    return this.stateTrackerNode;
  }

  run(...args: Array<any>) {
    // should not teardown, or props will cleaned two times
    // this.teardown();
    StateTrackerUtil.enterNode(this.state, this.stateTrackerNode);
    const nextArgs = [...args];
    let result;
    if (this.props) nextArgs.push(this.props);
    try {
      result = this.fn.apply(null, nextArgs);
    } catch (err) {
      console.error(new StateTrackerError(`Reaction fn run with error ${err}`));
    }

    StateTrackerUtil.leave(this.state);
    return result;
  }

  teardown() {
    this.log('teardown');
    this.stateTrackerNode.cleanup();
  }

  // for state update trigger
  schedulerRun() {
    this.log('schedulerRun');
    this.teardown();
    this.scheduler(this.run.bind(this));
  }

  enter() {
    StateTrackerUtil.enterNode(this.state, this.stateTrackerNode);
  }

  leave() {
    StateTrackerUtil.leave(this.state);
  }

  isPropsEqual(props: ReactionProps) {
    const truthy = this.stateTrackerNode.isPropsEqual(
      props,
      this._falsyScreenShot
    );
    if (!truthy) {
      // if props not equal, then tear down.
      this.teardown();
      this.updateObserverProps(props);
    }
    return truthy;
  }

  updateObserverProps(props: ReactionProps) {
    this.stateTrackerNode.setObserverProps(props);
    this.props = props;
  }

  performComparison(
    state: NextState,
    {
      enableRootComparison = true,
    }: {
      enableRootComparison: boolean;
    }
  ): {
    reaction: Reaction;
    isEqual: boolean;
  } {
    const keys = Object.keys(state);
    let truthy = true;
    const token = {
      reaction: this,
      isEqual: true,
    };

    if (enableRootComparison) {
      truthy = this.stateTrackerNode.isRootEqual(state);
      if (!truthy) {
        token.isEqual = false;
        this.log('performComparison', { token });
        return token;
      }
    } else {
      for (let idx = 0; idx < keys.length; idx++) {
        const root = [keys[idx]];
        truthy = this.stateTrackerNode.isStateEqual(
          state,
          root,
          this._falsyScreenShot
        );
        if (!truthy) {
          token.isEqual = false;
          this.log('performComparison', { token });
          return token;
        }
      }
    }

    return token;
  }
}

export default Reaction;
