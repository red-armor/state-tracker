function internal() {}
const proto = internal.prototype;

// const peek = (proxy: IProxyTracker | IES5Tracker, accessPath: Array<string>) => { // eslint-disable-line
//   return accessPath.reduce((proxy, cur: string) => {
//     proxy.setProp('isPeeking', true);
//     const nextProxy = proxy[cur];
//     proxy.setProp('isPeeking', false);
//     return nextProxy;
//   }, proxy);
// };

proto.hydrate = function() {};

proto.relink = function() {
  // const proxy = this
};

proto.update = function(newBaseValue: any) {
  const _tracker = this;
  _tracker._base = newBaseValue;
  _tracker._updateTimes = _tracker._updateTimes + 1;
};

export default internal;
