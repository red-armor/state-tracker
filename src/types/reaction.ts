import { IStateTracker } from './stateTracker';

export type ReactionOptions = {
  fn: Function;
  state: IStateTracker;
};

export type ReactionProps = {
  [key: string]: any;
};
