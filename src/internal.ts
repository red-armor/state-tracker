import { isObject } from './commons';
import { ChildProxies, Base, IndexType } from './types';

function internal() {}
const proto = internal.prototype;

proto.update = function(newBaseValue: any) {
  this.setBase(newBaseValue);
  this.incrementUpdateTimes();
};

proto.updateShadowBase = function(newBaseValue: any) {
  this.setShadowBase(newBaseValue);
  this.incrementUpdateTimes();
};

proto.getUpdateTimes = function() {
  return this._updateTimes;
};

proto.incrementUpdateTimes = function() {
  this._updateTimes += 1;
  return this._updateTimes;
};

proto.getBackwardAccessCount = function() {
  return this._backwardAccessCount;
};

proto.incrementBackwardAccessCount = function() {
  this._backwardAccessCount += 1;
  return this._backwardAccessCount;
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

proto.getBase = function(): Base {
  return this._base;
};

proto.setBase = function(value: any) {
  this._base = value;
};

proto.getShadowBase = function(): Base {
  return this._shadowBase;
};

proto.setShadowBase = function(value: any) {
  if (isObject(value) && typeof value.getTracker !== 'undefined') {
    this._shadowBase = value.getTracker().getShadowBase();
  } else {
    this._shadowBase = value;
  }
};

proto.getTrackedProperties = function(): Array<string> {
  return this._trackedProperties;
};

proto.updateTrackedProperties = function(prop: IndexType): void {
  if (this._trackedProperties.indexOf(prop) !== -1) {
    this._trackedProperties.push(prop);
  }
};

proto.getParentProxy = function() {
  return this._parentProxy;
};

proto.getChildProxies = function(): ChildProxies {
  return this._childProxies;
};

proto.setChildProxies = function(value: ChildProxies) {
  this._childProxies = value;
};

proto.getPeeking = function(): boolean {
  return this._isPeeking;
};

proto.setPeeking = function(falsy: boolean) {
  this._isPeeking = falsy;
};

proto.getStrictPeeking = function(): boolean {
  return this._isStrictPeeking;
};

proto.setStrictPeeking = function(falsy: boolean) {
  this._isStrictPeeking = falsy;
};

proto.getRootPath = function(): Array<string> {
  return this._rootPath;
};

proto.getAccessPath = function(): Array<string> {
  return this._accessPath;
};

proto.getStateTrackerContext = function() {
  return this._stateTrackerContext;
};

proto.getTime = function(): number {
  return this._lastUpdateAt;
};

proto.setTime = function(time: number) {
  this._lastUpdateAt = time;
};

proto.getMask = function(): string {
  return this._mask;
};

proto.setMask = function(value: string) {
  this._mask = value;
};

proto.getFocusKey = function(): string {
  return this._focusKey;
};

proto.setFocusKey = function(key: string) {
  this._focusKey = key;
};

proto.getType = function() {
  return this._type;
};

export default internal;
