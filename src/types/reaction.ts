import { IStateTracker } from './stateTracker';

export type ReactionOptions = {
  fn: Function;
  state: IStateTracker;
  scheduler?: Function;
};

export type ReactionProps = {
  [key: string]: any;
};
