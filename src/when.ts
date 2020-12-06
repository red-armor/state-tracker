import { IStateTracker } from './types';
import StateTrackerUtil from './StateTrackerUtil';
import collection from './collection';
import { isFunction } from './commons';
import Runner from './Runner';

let count = 0;

function when(
  state: IStateTracker,
  predicate: (state: IStateTracker) => boolean,
  effect: () => void
) {
  const id = `when_${count++}`;
  const autoRunFn = () => {
    state.enter(id);
    const falsy = predicate(state);
    if (!falsy) {
      const tracker = StateTrackerUtil.getContext(state).getCurrent();
      const paths = tracker.getRemarkable();
      const pathTree = collection.getPathTree(state);
      runner.updateAccessPaths(paths);
      pathTree!.addRunner(runner);
    } else if (isFunction(effect)) {
      effect();
    }
    state.leave();
    return falsy;
  };

  const runner = new Runner({
    autoRun: autoRunFn,
  });

  autoRunFn();
}

export default when;
