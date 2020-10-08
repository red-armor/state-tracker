import { Type } from './';
// import { InternalFunction } from './';
import { TRACKER } from '../commons';
import StateTrackerContext from '../StateTrackerContext';

export interface ProxyStateTrackerConfig {
  accessPath?: Array<string>;
  parentProxy?: IProxyStateTracker;
  rootPath: Array<string>;
}

export interface ProxyStateTrackerConstructorProps {
  accessPath: Array<string>;
  parentProxy: IProxyStateTracker | null;
  rootPath: Array<string>;
  base: any;
  stateTrackerContext: StateTrackerContext;
  context: string;
  lastUpdateAt: number;
  focusKey: string | null;
}

export interface ProxyStateTrackerProperties {
  _id: string;
  _accessPath: Array<string>;
  _rootPath: Array<string>;
  _type: Type.Array | Type.Object;
  _base: {
    [key: string]: any;
  };
  _parentProxy: IProxyStateTracker;
  _childProxies: {
    [key: string]: IProxyStateTracker;
  };
  _isPeeking: boolean;
  _updateTimes: number;
  _context: string;
  _lastUpdateAt: number;
  _stateTrackerContext: StateTrackerContext;
  _focusKey: string | null;
}

export type ProxyStateTrackerFunctions = {
  update(newValue: any): void;
  setContext(context: string): void;
  getContext(): string;
  getId(): string;
  getBase(): {
    [key: string]: any;
  };
  setBase(value: any): void;
  getParentProxy(): IProxyStateTracker;
  getChildProxies(): {
    [key: string]: IProxyStateTracker;
  };
  setChildProxies(value: Array<IProxyStateTracker>): void;
  getPeeking(): boolean;
  setPeeking(falsy: boolean): void;
  getRootPath(): Array<string>;
  getAccessPath(): Array<string>;
  getStateTrackerContext(): StateTrackerContext;
  getTime(): number;
  setTime(time: number): void;
  getFocusKey(): string | null;
  setFocusKey(key: string): void;
  getUpdateTimes(): number;
  incrementUpdateTimes(): number;
};

export type ProxyStateTrackerInterface = ProxyStateTrackerProperties &
  ProxyStateTrackerFunctions;

export interface ProxyStateTrackerConstructor {
  new ({
    accessPath,
    parentProxy,
    rootPath,
    base,
  }: ProxyStateTrackerConstructorProps): ProxyStateTrackerInterface;
}

export interface IProxyStateTracker {
  [TRACKER]: ProxyStateTrackerInterface;

  enter(): void;
  leave(): void;
  relink(path: Array<String>, value: any): void;
  unlink(): any;
  hydrate(path: Array<String>, value: any): void;
  getContext(): StateTrackerContext;
  getTracker(): ProxyStateTrackerInterface;
  peek(path: Array<string>): IProxyStateTracker;
  [key: string]: any;
}
