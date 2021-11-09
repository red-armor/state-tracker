import PathTree from './PathTree';
import StateTrackerContext from './StateTrackerContext';
import { IStateTracker, State } from './types';
import StateTrackerUtil from './StateTrackerUtil';

class Collection {
  private _trees: Map<string, PathTree>;

  constructor() {
    this._trees = new Map();
  }

  register(props: {
    base: State;
    proxyState: IStateTracker;
    stateTrackerContext: StateTrackerContext;
  }) {
    const { base, proxyState, stateTrackerContext } = props;
    const id = stateTrackerContext.getId();
    if (this._trees.has(id))
      throw new Error(
        `base value ${base} has been bound with ${stateTrackerContext}`
      );
    this._trees.set(
      id,
      new PathTree({
        base,
        proxyState,
        stateTrackerContext,
      })
    );
  }

  getPathTree(state: IStateTracker) {
    const context = StateTrackerUtil.getTracker(state)._stateTrackerContext;
    const contextId = context.getId();

    if (!this._trees.has(contextId))
      throw new Error(
        `state ${state} should be called with 'produce' function first`
      );
    return this._trees.get(contextId);
  }
}

export default new Collection();
