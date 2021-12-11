import { IStateTracker, ObserverOptions } from './types';
import Reaction from './Reaction';
import { isPlainObject } from './commons';
import StateTrackerError from './StateTrackerError';

// TODO: Now not work !!!, because reaction will run auto
export default (
  state: IStateTracker,
  fn: Function,
  options: ObserverOptions = {}
) => {
  let reaction: Reaction | null = null;

  let result = null as any;
  let isInitial = true;

  return function(...args: Array<any>) {
    const props = args[0];

    if (!reaction)
      reaction = new Reaction(
        { fn, state, scheduler: options.scheduler },
        props
      );

    if (props && !isPlainObject(props)) {
      throw new StateTrackerError(
        'The passing `props` in `options` param should be an object'
      );
    }
    let truthy = false;

    if (!isInitial) {
      if (!!props) truthy = reaction.isPropsEqual(props);
      else truthy = true;
    }

    if (truthy) return result;
    const nextResult = isInitial ? reaction.getResult() : reaction.run();
    isInitial = false;
    result = nextResult;
    return nextResult;
  };
};
