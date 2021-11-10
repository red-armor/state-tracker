import StateTrackerNode from './StateTrackerNode';
import StateTrackerUtil from './StateTrackerUtil';
import { generateReactionName } from './commons';
import { ReactionProps, ReactionOptions, IStateTracker } from './types';

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

  perform(state: IStateTracker) {
    return this.stateTrackerNode.isStateEqual(state);
  }
}

export default Reaction;
