import { produce as ES5Produce } from './es5';
import { produce as ES6Produce } from './proxy';
import { canIUseProxy } from './commons';

let produce;

if (canIUseProxy()) {
  produce = ES6Produce;
} else {
  produce = ES5Produce;
}

export default produce;
export * from './types';
