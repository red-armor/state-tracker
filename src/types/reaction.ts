import Reaction from '../Reaction';
import { IStateTracker } from './stateTracker';

export type ReactionFn = (state: IStateTracker, ...rest: Array<any>) => any;

export type ReactionOptions = {
  fn: ReactionFn;
  state: IStateTracker;
  scheduler?: Function;
};

export type ReactionProps = {
  [key: string]: any;
};

export type ReactionComparisonToken = {
  reaction: Reaction;
  isEqual: boolean;
};
