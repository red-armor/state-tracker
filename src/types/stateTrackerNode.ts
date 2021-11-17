import { Graph } from '../Graph';

export type EqualityToken = {
  key: string;
  falsy: boolean;
  nextValue: any;
  currentValue: any;
  [key: string]: any;
};

export type ComparisonToken = {
  action: string;
  reactionName: string;
  baseKey: string;
  graph: Graph;
  diffKey: string;
  nextValue: any;
  currentValue: any;
};

export type ChangedValue = {
  [key: string]: any;
};
