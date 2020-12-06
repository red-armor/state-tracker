import { produce as ES6Produce } from './proxy';
import { produce as ES5Produce } from './es5';

import { canIUseProxy } from './commons';
import StateTrackerUtil from './StateTrackerUtil';

let produce;

if (canIUseProxy()) {
  produce = ES6Produce;
} else {
  produce = ES5Produce;
}

export default produce;
export * from './types';
export { StateTrackerUtil };
export { default as when } from './when';
