import {
  IStateTracker,
  StateTrackerInterface,
  // StateTrackerProperties,
} from './stateTracker';
import StateTrackerContext from '../StateTrackerContext';

export interface ProduceState {
  [key: string]: any;
}

export interface ProduceProxyOptions {
  accessPath: Array<string>;
  parentProxy?: IStateTracker;
  rootPath: Array<string>;
  stateTrackerContext?: StateTrackerContext;
  // mayReusedTracker?: null | StateTrackerProperties;
  context?: string;
  // focusKey?: string | null;
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

export type Produce = (
  state: ProduceState,
  options?: ProduceOptions
) => IStateTracker;

export type RelinkValue = {
  path: Array<string>;
  value: any;
};
