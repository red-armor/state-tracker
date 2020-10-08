import { IProxyStateTracker } from './types';

function internal() {}
const proto = internal.prototype;

proto.update = function(newBaseValue: any) {
  this.setBase(newBaseValue);
  this.incrementUpdateTimes();
};

proto.getUpdateTimes = function() {
  return this._updateTimes;
};

proto.incrementUpdateTimes = function() {
  this._updateTimes += 1;
  return this._updateTimes;
};

proto.setContext = function(context: string) {
  this._context = context;
};

proto.getContext = function() {
  return this._context;
};

proto.getId = function() {
  return this._id;
};

proto.getBase = function() {
  return this._base;
};

proto.setBase = function(value: any) {
  this._base = value;
};

proto.getParentProxy = function() {
  return this._parentProxy;
};

proto.getChildProxies = function() {
  return this._childProxies;
};

proto.setChildProxies = function(value: Array<IProxyStateTracker>) {
  this._childProxies = value;
};

proto.getPeeking = function() {
  return this._isPeeking;
};

proto.setPeeking = function(falsy: boolean) {
  this._isPeeking = falsy;
};

proto.getRootPath = function() {
  return this._rootPath;
};

proto.getAccessPath = function() {
  return this._accessPath;
};

proto.getStateTrackerContext = function() {
  return this._stateTrackerContext;
};

proto.getTime = function() {
  return this._lastUpdateAt;
};

proto.setTime = function(time: number) {
  this._lastUpdateAt = time;
};

proto.getFocusKey = function() {
  return this._focusKey;
};

proto.setFocusKey = function(key: string) {
  this._focusKey = key;
};

export default internal;
