import { IStateTracker, StateTrackerInterface } from './stateTracker';
import StateTrackerContext from '../StateTrackerContext';

export interface State {
  [key: string]: any;
}

export interface ProduceProps {
  state: State;
  affected?: WeakMap<object, unknown>;
  proxyCache?: WeakMap<object, unknown>;
}

export interface ProduceProxyOptions {
  accessPath: Array<string>;
  parentProxy?: IStateTracker;
  rootPath: Array<string>;
  stateTrackerContext: StateTrackerContext;
  context?: string;
  isDraft?: boolean;
}

export interface ProduceOptions {
  accessPath: Array<string>;
  parentProxy?: IStateTracker;
  rootPath: Array<string>;
  stateTrackerContext: StateTrackerContext;
  mayReusedTracker: null | StateTrackerInterface;
  context?: string;
  focusKey: string | null;
  isDraft?: boolean;
}

export type Produce = (state: State, options?: ProduceOptions) => IStateTracker;

export type RelinkValue = {
  path: Array<string>;
  value: any;
};
