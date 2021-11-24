import StateTrackerNode from './StateTrackerNode';
import {
  Activity,
  ActivityToken,
  TrackActivity,
  ComparisonActivity,
  ComparisonStartActivity,
  ComparisonResultActivity,
  ComparisonEndActivity,
  ResolveActivityTokenPayload,
  PerformComparisonStart,
} from './types';

const performComparisonStart = (payload: PerformComparisonStart) => {
  const { stateCompareLevel, affectedRootKeys } = payload;
  return {
    stateCompareLevel,
    affectedRootKeys,
  };
};

const registerProps = (stn: StateTrackerNode) => {
  const registeredKeys = Object.keys(stn.getProps());
  return {
    registeredKeys,
  };
};

const cleanupStateDeps = (stn: StateTrackerNode) => {
  const stateGraphMap = stn.stateGraphMap;
  return { stateGraphMap };
};

const cleanupPropsDeps = (stn: StateTrackerNode) => {
  const propsGraphMap = stn.propsGraphMap;
  return { propsGraphMap };
};

const track = (payload: TrackActivity) => {
  const { path, value, target, propsTargetKey } = payload;

  const result: any = {
    path,
    value,
    target,
    type: propsTargetKey ? 'props' : 'state',
  };
  if (propsTargetKey) result.propsTargetKey = propsTargetKey;

  return result;
};

const trackDepsEnd = (stn: StateTrackerNode) => {
  return {
    stateGraphMap: stn.stateGraphMap,
    propsGraphMap: stn.propsGraphMap,
  };
};

const comparison = (stn: StateTrackerNode, payload: ComparisonActivity) => {
  const { childrenMap } = payload;
  const keys = Array.from(childrenMap?.keys());
  return {
    keys,
    isShallowEqual: stn.getShallowEqual(),
  };
};

const comparisonStart = (
  stn: StateTrackerNode,
  payload: ComparisonStartActivity
) => {
  const { type } = payload;
  return { type, isShallowEqual: stn.getShallowEqual() };
};

const comparisonResult = (
  stn: StateTrackerNode,
  payload: ComparisonResultActivity
) => {
  const { type, equalityToken } = payload;
  const result: any = {
    type,
    isShallowEqual: stn.getShallowEqual(),
    isEqual: true,
  };
  if (!equalityToken.isEqual) return { ...result, ...equalityToken };
  return result;
};

const comparisonEnd = (
  stn: StateTrackerNode,
  payload: ComparisonEndActivity
) => {
  const { type } = payload;
  return { type, isShallowEqual: stn.getShallowEqual() };
};

export const resolveActivityToken = <T extends Activity>({
  activity,
  stateTrackerNode,
  payload,
}: {
  activity: Activity;
  stateTrackerNode: StateTrackerNode;
  payload?: ResolveActivityTokenPayload<T>;
}) => {
  const token: ActivityToken = {
    activity,
    name: stateTrackerNode.name,
  };

  switch (activity) {
    case 'registerProps':
      token.payload = registerProps(stateTrackerNode);
      return token;

    case 'schedulerRunStart':
      return token;

    case 'schedulerRunEnd':
      return token;

    case 'trackDepsStart':
      return token;

    case 'trackDepsEnd':
      token.payload = trackDepsEnd(stateTrackerNode);
      return token;

    case 'cleanupStateDeps':
      token.payload = cleanupStateDeps(stateTrackerNode);
      return token;

    case 'cleanupPropsDeps':
      token.payload = cleanupPropsDeps(stateTrackerNode);
      return token;

    case 'track':
      token.payload = track(payload as TrackActivity);
      return token;

    case 'comparison':
      token.payload = comparison(
        stateTrackerNode,
        payload as ComparisonActivity
      );
      return token;

    case 'comparisonStart':
      token.payload = comparisonStart(
        stateTrackerNode,
        payload as ComparisonActivity
      );
      return token;

    case 'comparisonResult':
      token.payload = comparisonResult(
        stateTrackerNode,
        payload as ComparisonResultActivity
      );
      return token;

    case 'comparisonEnd':
      token.payload = comparisonEnd(
        stateTrackerNode,
        payload as ComparisonActivity
      );
      return token;

    case 'makeComparisonFailed':
      token.payload = payload;
      return token;

    case 'performComparisonStart':
      token.payload = performComparisonStart(payload as PerformComparisonStart);
      return token;

    case 'performComparisonEnd':
      return token;
    default:
      return token;
  }
};
