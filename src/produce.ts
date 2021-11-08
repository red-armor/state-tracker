import { ProduceState } from './types';

const produce = (
  state: ProduceState,
  affected: WeakMap<object, unknown>,
  proxyCache?: WeakMap<object, unknown>
) => {};

export default produce;
