import { IStateTracker } from './types';
import Reaction from './Reaction';
import { isPlainObject } from './commons';
import StateTrackerError from './StateTrackerError';

export default (
  state: IStateTracker,
  fn: Function
  // options?: ObserverOptions
) => {
  const reaction = new Reaction({ fn, state });

  let result = null as any;
  let isInitial = true;

  return function(...args: Array<any>) {
    const props = args[0];

    // if (args0 && !isPlainObject(args0)) {
    //   throw new StateTrackerError(
    //     "Observed function's args should match the following rules: \n" +
    //       '  1. only one param\n' +
    //       '  2. param should be an object\n'
    //   );
    // }

    if (props && !isPlainObject(props)) {
      throw new StateTrackerError(
        'The passing `props` in `options` param should be an object'
      );
    }

    const isPropsEqual = reaction.isPropsEqual(props);
    const truthy = isInitial ? false : !!props ? isPropsEqual : true;

    if (truthy) return result;
    isInitial = false;

    const nextResult = reaction.run();

    console.log('reaction ', reaction.getStateTrackerNode().stateGraph);
    result = nextResult;
    return nextResult;
  };
};
