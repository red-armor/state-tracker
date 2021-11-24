import Reaction from '../Reaction';
import { IStateTracker } from './stateTracker';

export type ReactionOptions = {
  fn: Function;
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
