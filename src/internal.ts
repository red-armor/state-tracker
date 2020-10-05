function internal() {}
const proto = internal.prototype;

proto.hydrate = function() {};

proto.update = function(newBaseValue: any) {
  const _tracker = this;
  _tracker._base = newBaseValue;
  _tracker._updateTimes = _tracker._updateTimes + 1;
};

proto.setContext = function(context: string) {
  const _tracker = this;
  _tracker._context = context;
};

export default internal;
