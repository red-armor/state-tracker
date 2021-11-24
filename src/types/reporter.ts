import { EntityType } from './stateTrackerNode';
import Graph from '../Graph';
import { EqualityToken } from './stateTrackerNode';

export type PerformComparisonStart = {
  stateCompareLevel: number;
  affectedRootKeys: Array<string>;
};

export type TrackActivity = {
  path: Array<string>;
  propsTargetKey?: string;
  target: any;
  value: any;
};

export type ComparisonActivity = {
  type: EntityType;
  childrenMap: Map<string | number, Graph>;
};

export type makeComparisonFailedActivity = {
  type: EntityType;
  affectedPath: Array<string>;
  affectedKey: string;
  currentValue: any;
  nextValue: any;
};

export type ComparisonStartActivity = {
  type: EntityType;
};

export type ComparisonEndActivity = {
  type: EntityType;
};

export type ComparisonResultActivity = {
  type: EntityType;
  equalityToken: EqualityToken;
};

export type ActivityToken = {
  activity: string;
  name: string;
  payload?: {
    [key: string]: any;
  };
};

export type Activity =
  | 'registerProps'
  | 'schedulerRunStart'
  | 'schedulerRunEnd'
  | 'cleanupStateDeps'
  | 'cleanupPropsDeps'
  | 'track'
  | 'teardown'
  | 'trackDepsStart'
  | 'trackDepsEnd'
  | 'comparison'
  | 'makeComparisonFailed'
  | 'comparisonStart'
  | 'comparisonEnd'
  | 'comparisonResult'
  | 'performComparisonStart'
  | 'performComparisonEnd';

export type ResolveActivityTokenPayload<
  T extends Activity
> = T extends 'performComparisonStart'
  ? PerformComparisonStart
  : T extends 'track'
  ? TrackActivity
  : T extends 'comparison'
  ? ComparisonActivity
  : T extends 'makeComparisonFailed'
  ? makeComparisonFailedActivity
  : T extends 'comparisonStart'
  ? ComparisonStartActivity
  : T extends 'comparisonEnd'
  ? ComparisonEndActivity
  : T extends 'comparisonResult'
  ? ComparisonResultActivity
  : never;
