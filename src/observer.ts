import { ObserverOptions, IStateTracker } from './types';
import Reaction from './Reaction';
import { isPlainObject, generateReactionName } from './commons';
import StateTrackerError from './StateTrackerError';
import StateTrackerUtil from './StateTrackerUtil';
import StateTrackerNode from './StateTrackerNode';

export default (
  state: IStateTracker,
  fn: Function,
  options: ObserverOptions
) => {
  const { props } = options;
  const reaction = new Reaction({ fn });
  const reactionName = fn.name ? fn.name : generateReactionName();
  const stateTrackerNode = new StateTrackerNode(reactionName);
  let result = null as any;
  let isInitial = true;

  return function(...args: Array<any>) {
    const args0 = args[0];

    if (!isPlainObject(args0)) {
      throw new StateTrackerError(
        "Observed function's args should match the following rules: \n" +
          '  1. only one param\n' +
          '  2. param should be an object\n'
      );
    }

    if (props && !isPlainObject(props)) {
      throw new StateTrackerError(
        'The passing `props` in `options` param should be an object'
      );
    }

    const truthy = isInitial
      ? !!props
        ? stateTrackerNode.isPropsEqual(props)
        : true
      : false;

    isInitial = false;
    if (truthy) return result;

    StateTrackerUtil.enterNode(state, stateTrackerNode);
    const nextArgs = props ? { ...args0, ...props } : args0;
    const nextResult = reaction.run([nextArgs]);
    StateTrackerUtil.leave(state);
    result = nextResult;
    return nextResult;
  };
};
