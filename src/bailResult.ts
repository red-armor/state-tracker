import { IStateTracker } from './types';
import StateTrackerUtil from './StateTrackerUtil';

const bailResult = (
  state: IStateTracker,
  fns: Array<Function>,
  predicate?: (v: any) => boolean
) => {
  const nextFns = ([] as Array<Function>).concat(fns);
  const stc = StateTrackerUtil.getContext(state);
  const nextPredicate = predicate || (v => typeof v !== 'undefined');

  const stn = stc.getCurrent();
  const reaction = stn.getReaction();
  let hasError = false;
  let value;

  const len = nextFns.length;

  for (let i = 0; i < len; i++) {
    try {
      const fn = nextFns[i];
      const result = fn.call(null, state);
      if (nextPredicate(result)) {
        value = result;
        break;
      }
    } catch (err) {
      console.log('err ', err);
      hasError = true;
    }
  }

  if (hasError) reaction?.setStateCompareLevel(0);
  else reaction?.setStateCompareLevel(1);

  return value;
};

export default bailResult;
