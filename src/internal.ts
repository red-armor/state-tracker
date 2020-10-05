// import { IProxyStateTracker } from './types';

function internal() {}
const proto = internal.prototype;

// const peek = (proxyState: IProxyStateTracker, accessPath: Array<string>) => { // eslint-disable-line
//   return accessPath.reduce((nextProxyState, cur: string) => {
//     const tracker = nextProxyState;
//     tracker.isPeeking = true;
//     const nextProxy = nextProxyState[cur];
//     tracker.isPeeking = false;
//     return nextProxy;
//   }, proxyState);
// };

proto.hydrate = function() {};

proto.update = function(newBaseValue: any) {
  const _tracker = this;
  _tracker._base = newBaseValue;
  _tracker._updateTimes = _tracker._updateTimes + 1;
};

export default internal;
