import { IStateTracker } from './types';
import StateTrackerUtil from './StateTrackerUtil';
import collection from './collection';
import { isFunction } from './commons';
import Runner from './Runner';

function when(
  state: IStateTracker,
  predicate: (state: IStateTracker) => boolean,
  effect?: () => void
) {
  const autoRunFn = () => {
    StateTrackerUtil.enter(state);

    const falsy = predicate(state);
    if (!falsy) {
      const tracker = StateTrackerUtil.getContext(state).getCurrent();
      const paths = tracker.getRemarkable();
      const pathTree = collection.getPathTree(state);
      runner.updateAccessPaths(paths);
      pathTree!.addRunner(runner);
    } else if (isFunction(effect)) {
      effect!();
    }
    StateTrackerUtil.leave(state);
    return falsy;
  };

  const runner = new Runner({
    autoRun: autoRunFn,
  });

  autoRunFn();
}

export default when;
