// import { produce as ES6Produce } from './proxy';
// import { produce as ES5Produce } from './es5';

// import { canIUseProxy } from './commons';
import StateTrackerUtil from './StateTrackerUtil';

// let produce;

// produce = ES6Produce;

// if (canIUseProxy()) {
//   produce = ES6Produce;
// } else {
//   produce = ES5Produce;
// }

export { default as observer } from './observer';
export { default as produce } from './produce';
export * from './types';
export { StateTrackerUtil };
export { default as when } from './when';
export { default as watch } from './watch';
export { default as Reaction } from './Reaction';
export { default as bailResult } from './bailResult';
export * from './proxy';
