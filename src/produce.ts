import { State, IStateTracker } from './types';
import { produceImpl } from './proxy';

const produce = (
  state: State,
  affected?: WeakMap<object, IStateTracker>,
  proxyCache?: WeakMap<object, IStateTracker>
) => {
  return produceImpl(state, affected, proxyCache);
};

export default produce;
