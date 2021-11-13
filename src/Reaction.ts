import StateTrackerNode from './StateTrackerNode';
import StateTrackerUtil from './StateTrackerUtil';
import { generateReactionName, noop } from './commons';
import { ReactionProps, IStateTracker, NextState } from './types';
import StateTrackerError from './StateTrackerError';

class Reaction {
  private fn: Function;
  private name: string;
  private state: IStateTracker;
  private stateTrackerNode: StateTrackerNode;
  private props?: ReactionProps;
  private scheduler: Function;
  private _shallowEqual: boolean = true;

  private _disposer: Function = noop;

  constructor(
    options: {
      fn: Function;
      state: IStateTracker;
      scheduler?: Function;
      shallowEqual?: boolean;
    },
    props?: ReactionProps
  ) {
    const { fn, state, scheduler, shallowEqual } = options;
    this.name = fn.name ? fn.name : generateReactionName();
    this.state = state;
    this._shallowEqual =
      typeof shallowEqual === 'boolean' ? shallowEqual : true;
    this.stateTrackerNode = new StateTrackerNode({
      name: this.name,
      shallowEqual: this._shallowEqual,
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

  dispose() {
    this._disposer();
  }

  getStateTrackerNode() {
    return this.stateTrackerNode;
  }

  run() {
    // should not teardown, or props will cleaned two times
    // this.teardown();
    StateTrackerUtil.enterNode(this.state, this.stateTrackerNode);
    const args = [];
    let result;
    if (this.props) args.push(this.props);
    try {
      result = this.fn.apply(null, args);
    } catch (err) {
      console.error(new StateTrackerError(`Reaction fn run with error ${err}`));
    }

    StateTrackerUtil.leave(this.state);
    return result;
  }

  teardown() {
    this.stateTrackerNode.cleanup();
  }

  // for state update trigger
  schedulerRun() {
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
    const truthy = this.stateTrackerNode.isPropsEqual(props);
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
        return token;
      }
    } else {
      for (let idx = 0; idx < keys.length; idx++) {
        const root = [keys[idx]];
        truthy = this.stateTrackerNode.isStateEqual(state, root);
        if (!truthy) {
          token.isEqual = false;
          return token;
        }
      }
    }

    return token;
  }
}

export default Reaction;
