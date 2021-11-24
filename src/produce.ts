import { produceImpl } from './proxy';
import { canIUseProxy } from './commons';
import { produceImpl as produceImplES5 } from './es5';
import { State, IStateTracker } from './types';

const produce = (
  state: State,
  affected?: WeakMap<object, IStateTracker>,
  proxyCache?: WeakMap<object, IStateTracker>
) => {
  if (canIUseProxy()) return produceImpl(state, affected, proxyCache);
  return produceImplES5(state, affected, proxyCache);
};

export default produce;
