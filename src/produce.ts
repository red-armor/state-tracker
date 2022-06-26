import { produceImpl } from './proxy';
import { canIUseProxy } from './commons';
import { produceImpl as produceImplES5 } from './es5';
import { State, IStateTracker } from './types';

const produce = (state: State, proxyCache?: WeakMap<object, IStateTracker>) => {
  if (canIUseProxy()) return produceImpl(state, proxyCache);
  return produceImplES5(state, proxyCache);
};

export default produce;
