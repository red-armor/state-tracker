import { produce as ES6Produce } from './proxy';
import StateTrackerUtil from './StateTrackerUtil';

import { Produce } from './types/produce';

const produce = ES6Produce;

export default produce as Produce;
export * from './types';
export { StateTrackerUtil };
