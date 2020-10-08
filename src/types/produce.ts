import { IStateTracker, StateTrackerInterface } from './stateTracker';
import StateTrackerContext from '../StateTrackerContext';

export interface ProduceState {
  [key: string]: any;
}

export interface ProduceOptions {
  accessPath: Array<string>;
  parentProxy?: IStateTracker;
  rootPath: Array<string>;
  stateTrackerContext: StateTrackerContext;
  mayReusedTracker: null | StateTrackerInterface;
  context?: string;
  focusKey: string | null;
}
