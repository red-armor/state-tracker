import { Type } from './';
import { TRACKER } from '../commons';
import StateTrackerContext from '../StateTrackerContext';
// import ChildProxy from '../ChildProxy';
import { RelinkValue } from './produce';

export interface ProxyStateTrackerConfig {
  accessPath?: Array<string>;
  parentProxy?: IStateTracker;
  rootPath: Array<string>;
}

export interface ChildProxies {
  [key: string]: IStateTracker;
}

// export interface SubProxies {
//   [key: string]: ChildProxy;
// }

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
  context: string;
  lastUpdateAt: number;
  focusKey: string | null;
  mask: string;
}

export interface StateTrackerProperties {
  _id: string;
  _accessPath: Array<string>;
  _rootPath: Array<string>;
  _type: Type.Array | Type.Object;
  _base: Base;
  _shadowBase: Base;
  _parentProxy: IStateTracker;
  _childProxies: ChildProxies;
  _isPeeking: boolean;
  _isStrictPeeking: boolean;
  _updateTimes: number;
  _context: string;
  _lastUpdateAt: number;
  _stateTrackerContext: StateTrackerContext;
  _focusKey: string | null;
  _mask: string;
}

export type StateTrackerFunctions = {
  update(newValue: any): void;
  updateShadowBase(newValue: any): void;
  setContext(context: string): void;
  getContext(): string;
  getId(): string;
  getBase(): Base;
  setBase(value: any): void;
  getShadowBase(): Base;
  setShadowBase(value: any): void;
  getTrackedProperties(): Array<string>;
  updateTrackedProperties(prop: string): void;
  getParentProxy(): IStateTracker;
  getChildProxies(): ChildProxies;
  setChildProxies(value: ChildProxies): void;
  getPeeking(): boolean;
  setPeeking(falsy: boolean): void;
  getStrictPeeking(): boolean;
  setStrictPeeking(falsy: boolean): void;
  getRootPath(): Array<string>;
  getAccessPath(): Array<string>;
  getStateTrackerContext(): StateTrackerContext;
  getTime(): number;
  setTime(time: number): void;
  getMask(): string;
  setMask(value: string): void;
  getFocusKey(): string | null;
  setFocusKey(key: string): void;
  getUpdateTimes(): number;
  incrementUpdateTimes(): number;
  getType(): string;
};

export type StateTrackerInterface = StateTrackerProperties &
  StateTrackerFunctions;

export interface StateTrackerConstructor {
  new ({
    accessPath,
    parentProxy,
    rootPath,
    base,
  }: StateTrackerConstructorProps): StateTrackerInterface;
}

export interface IStateTracker {
  [TRACKER]: StateTrackerInterface;

  enter(context?: string): void;
  strictEnter(context?: string): void;
  leave(): void;
  relink(path: Array<String>, value: any): void;
  batchRelink(values: Array<RelinkValue>): IStateTracker;
  unlink(): any;
  hydrate(path: Array<String>, value: any): void;
  getContext(): StateTrackerContext;
  getTracker(): StateTrackerInterface;
  peek(path: Array<string>): IStateTracker;
  [key: string]: any;
}

export type ProxyState = IStateTracker;
