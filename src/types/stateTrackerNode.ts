import { Reaction } from '..';
import Graph from '../Graph';

export type EqualityToken = {
  key: string;
  isEqual: boolean;
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

export type ScreenshotToken = {
  reaction?: Reaction;
  diffKey: string;
  nextValue: any;
  currentValue: any;
  action: string;
  graph: Map<string, Graph>;
};

export type ChangedValue = {
  [key: string]: any;
};

export type EntityType = 'props' | 'state';
