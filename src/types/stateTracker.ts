import { Type } from './';
import { TRACKER, PATH_TRACKER } from '../commons';
import StateTrackerContext from '../StateTrackerContext';
import PathTracker from '../PathTracker';

export interface ProxyStateTrackerConfig {
  accessPath?: Array<string>;
  parentProxy?: IStateTracker;
  rootPath: Array<string>;
}

export interface ChildProxies {
  [key: string]: IStateTracker;
}

export interface FocusKeyToTrackerMap {
  [key: string]: IStateTracker;
}

export interface Base {
  [key: string]: any;
}

export interface StateTrackerConstructorProps {
  accessPath: Array<string>;
  parentProxy: IStateTracker | null;
  rootPath: Array<string>;
  base: any;
  shadowBase?: any;
  stateTrackerContext: StateTrackerContext;
  lastUpdateAt: number;
  // focusKey: string | null;
}
export interface StateTrackerProperties {
  _id: string;
  _useProxy: boolean;
  _accessPath: Array<string>;
  _rootPath: Array<string>;
  _type: Type.Array | Type.Object;
  _base: Base;
  // _shadowBase: Base;
  _parentProxy: IStateTracker | null;
  _childProxies: ChildProxies;
  _nextChildProxies: any;
  // _focusKeyToTrackerMap: FocusKeyToTrackerMap;
  _isPeeking: boolean;
  _isStrictPeeking: boolean;
  // _updateTimes: number;
  // _backwardAccessCount: number;
  _lastUpdateAt: number;
  _stateTrackerContext: StateTrackerContext;
  // _focusKey: string | null;
}

export type StateTrackerInterface = StateTrackerProperties;

export interface IStateTracker {
  [TRACKER]: StateTrackerInterface;
  [PATH_TRACKER]: PathTracker;
  [key: string]: any;
}

export type ProxyState = IStateTracker;
