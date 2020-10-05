import { Type } from './';
import { InternalFunction } from './';
import { TRACKER } from '../commons';
import StateTrackerContext from '../StateTrackerContext';

export interface ProxyStateTrackerConfig {
  accessPath?: Array<string>;
  parentProxy?: IProxyStateTracker;
  rootPath: Array<string>;
  useRevoke: boolean;
  useScope: boolean;
}

export interface ProxyStateTrackerConstructorProps {
  accessPath: Array<string>;
  parentProxy: IProxyStateTracker | null;
  rootPath: Array<string>;
  _base: any;
  useRevoke: boolean;
  useScope: boolean;
  stateTrackerContext: StateTrackerContext;
}

export interface ProxyStateTrackerProperties {
  id: string;
  accessPath: Array<string>;
  rootPath: Array<string>;
  type: Type.Array | Type.Object;
  _base: {
    [key: string]: any;
  };
  parentProxy: IProxyStateTracker;
  childProxies: {
    [key: string]: IProxyStateTracker;
  };
  isPeeking: boolean;
  paths: Array<Array<string>>;
  useRevoke: boolean;
  useScope: boolean;
  _updateTimes: number;
}
export type ProxyStateTrackerFunctions = InternalFunction;

export type ProxyStateTrackerInterface = ProxyStateTrackerProperties &
  ProxyStateTrackerFunctions;

export interface ProxyStateTrackerConstructor {
  new ({
    accessPath,
    parentProxy,
    rootPath,
    _base,
    useRevoke,
    useScope,
  }: ProxyStateTrackerConstructorProps): ProxyStateTrackerInterface;
}

export interface IProxyStateTracker {
  [TRACKER]: ProxyStateTrackerInterface;

  enter(): void;
  leave(): void;
  getContext(): StateTrackerContext;
  [key: string]: any;
}
