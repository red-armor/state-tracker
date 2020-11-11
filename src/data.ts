const b = {
  update: function(newBaseValue: any) {
    this.setBase(newBaseValue);
    this.incrementUpdateTimes();
  },

  updateShadowBase: function(newBaseValue: any) {
    this.setShadowBase(newBaseValue);
    this.incrementUpdateTimes();
  },

  getUpdateTimes: function() {
    return this._updateTimes;
  },

  incrementUpdateTimes: function() {
    this._updateTimes += 1;
    return this._updateTimes;
  },

  getBackwardAccessCount: function() {
    return this._backwardAccessCount;
  },

  incrementBackwardAccessCount: function() {
    this._backwardAccessCount += 1;
    return this._backwardAccessCount;
  },

  setContext: function(context: string) {
    this._context = context;
  },

  getContext: function() {
    return this._context;
  },

  getId: function() {
    return this._id;
  },

  getBase: function(): Base {
    return this._base;
  },

  setBase: function(value: any) {
    this._base = value;
  },

  getShadowBase: function(): Base {
    return this._shadowBase;
  },

  setShadowBase: function(value: any) {
    if (isObject(value) && typeof value.getTracker !== 'undefined') {
      this._shadowBase = value.getTracker().getShadowBase();
    } else {
      this._shadowBase = value;
    }
  },

  getTrackedProperties: function(): Array<string> {
    return this._trackedProperties;
  },

  updateTrackedProperties: function(prop: IndexType): void {
    if (this._trackedProperties.indexOf(prop) !== -1) {
      this._trackedProperties.push(prop);
    }
  },

  getParentProxy: function() {
    return this._parentProxy;
  },

  getChildProxies: function(): ChildProxies {
    return this._childProxies;
  },

  setChildProxies: function(value: ChildProxies) {
    this._childProxies = value;
  },

  setFocusKeyToTrackerMap: function(value: FocusKeyToTrackerMap) {
    this._focusKeyToTrackerMap = value;
  },

  getFocusKeyToTrackerMap: function(): FocusKeyToTrackerMap {
    return this._focusKeyToTrackerMap;
  },

  getPeeking: function(): boolean {
    return this._isPeeking;
  },

  setPeeking: function(falsy: boolean) {
    this._isPeeking = falsy;
  },

  getStrictPeeking: function(): boolean {
    return this._isStrictPeeking;
  },

  setStrictPeeking: function(falsy: boolean) {
    this._isStrictPeeking = falsy;
  },

  getRootPath: function(): Array<string> {
    return this._rootPath;
  },

  getAccessPath: function(): Array<string> {
    return this._accessPath;
  },

  getStateTrackerContext: function() {
    return this._stateTrackerContext;
  },

  getTime: function(): number {
    return this._lastUpdateAt;
  },

  setTime: function(time: number) {
    this._lastUpdateAt = time;
  },

  getMask: function(): string {
    return this._mask;
  },

  setMask: function(value: string) {
    this._mask = value;
  },

  getFocusKey: function(): string {
    return this._focusKey;
  },

  setFocusKey: function(key: string) {
    this._focusKey = key;
  },

  getType: function() {
    return this._type;
  },
};
