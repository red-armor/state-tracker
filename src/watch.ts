import { IStateTracker } from './types';
import when from './when';

function watch(state: IStateTracker, fn: Function) {
  when(state, state => {
    fn(state);
    return false;
  });
}

export default watch;
