import StateTrackerNode from './StateTrackerNode';
import StateTrackerUtil from './StateTrackerUtil';
import { generateReactionName } from './commons';
import {
  ReactionProps,
  ReactionOptions,
  IStateTracker,
  NextState,
} from './types';

const noop = (fn: Function) => fn.call(null);

class Reaction {
  private fn: Function;
  private name: string;
  private state: IStateTracker;
  private stateTrackerNode: StateTrackerNode;
  private props?: ReactionProps;
  private scheduler: Function;

  constructor(options: ReactionOptions, props?: ReactionProps) {
    const { fn, state, scheduler } = options;
    this.name = fn.name ? fn.name : generateReactionName();
    this.state = state;
    this.stateTrackerNode = new StateTrackerNode(this.name);
    this.props = props;
    this.fn = fn;
    this.scheduler = scheduler || noop;

    this.register();
  }

  register() {
    const context = StateTrackerUtil.getTracker(this.state)
      ._stateTrackerContext;
    const container = context.container;

    const disposer = container.register(this);
    return disposer;
  }

  getStateTrackerNode() {
    return this.stateTrackerNode;
  }

  run() {
    // should not teardown, or props will cleaned two times
    // this.teardown();
    StateTrackerUtil.enterNode(this.state, this.stateTrackerNode);
    const args = [];
    if (this.props) args.push(this.props);
    const result = this.fn.apply(null, args);
    StateTrackerUtil.leave(this.state);
    return result;
  }

  teardown() {
    this.stateTrackerNode.cleanup();
  }

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
    state: NextState
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

    for (let idx = 0; idx < keys.length; idx++) {
      const root = [keys[idx]];
      truthy = this.stateTrackerNode.isStateEqual(state, root);
      if (!truthy) {
        token.isEqual = false;
        return token;
      }
    }

    return token;
  }
}

export default Reaction;
