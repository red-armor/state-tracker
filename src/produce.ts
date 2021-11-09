import { ProduceState, IStateTracker } from './types';
import { produceImpl } from './proxy';

const produce = (
  state: ProduceState,
  affected?: WeakMap<object, IStateTracker>,
  proxyCache?: WeakMap<object, IStateTracker>
) => {
  return produceImpl(state, affected, proxyCache);
};

export default produce;
