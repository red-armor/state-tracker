import StateTrackerNode from './StateTrackerNode';
import StateTrackerUtil from './StateTrackerUtil';
import { generateReactionName } from './commons';
import {
  ReactionProps,
  ReactionOptions,
  IStateTracker,
  NextState,
} from './types';

class Reaction {
  private fn: Function;
  private name: string;
  private state: IStateTracker;
  private stateTrackerNode: StateTrackerNode;
  private props?: ReactionProps;

  constructor(options: ReactionOptions, props?: ReactionProps) {
    const { fn, state } = options;
    this.name = fn.name ? fn.name : generateReactionName();
    this.state = state;
    this.stateTrackerNode = new StateTrackerNode(this.name);
    this.props = props;
    this.fn = fn;

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
    StateTrackerUtil.enterNode(this.state, this.stateTrackerNode);
    const args = [];
    if (this.props) args.push(this.props);
    const result = this.fn.apply(null, args);
    StateTrackerUtil.leave(this.state);
    return result;
  }

  isPropsEqual(props: ReactionProps) {
    const truthy = this.stateTrackerNode.isPropsEqual(props);
    if (!truthy) this.updateObserverProps(props);
    return truthy;
  }

  updateObserverProps(props: ReactionProps) {
    this.stateTrackerNode.setObserverProps(props);
    this.props = props;
  }

  perform(state: NextState, rootPath: Array<string> = ['app']) {
    const falsy = this.stateTrackerNode.isStateEqual(state, rootPath);
    return falsy;
  }
}

export default Reaction;
