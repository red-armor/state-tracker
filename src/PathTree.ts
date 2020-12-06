import PathNode from './PathNode';
import Runner from './Runner';
import StateTrackerContext from './StateTrackerContext';
import { IStateTracker, PendingRunners, ProduceState } from './types';
import { UPDATE_TYPE } from './types/pathTree';
import { shallowEqual, isTypeEqual, isPrimitive, isMutable } from './commons';

class PathTree {
  public node: PathNode;
  readonly _state: IStateTracker;
  readonly _base: ProduceState;
  readonly _stateTrackerContext: StateTrackerContext;
  private _updateType: UPDATE_TYPE | null;
  public pendingRunners: Array<PendingRunners>;

  constructor({
    base,
    proxyState,
    stateTrackerContext,
  }: {
    proxyState: IStateTracker;
    base: ProduceState;
    stateTrackerContext: StateTrackerContext;
  }) {
    this.node = new PathNode({
      type: 'default',
      prop: 'root',
    });
    this._state = proxyState;
    this._base = base;
    this._stateTrackerContext = stateTrackerContext;
    this.pendingRunners = [];
    this._updateType = null;
  }

  getUpdateType() {
    return this._updateType;
  }

  addRunner(runner: Runner) {
    const accessPaths = runner.getAccessPaths();
    accessPaths.forEach(accessPath => {
      this.node.addRunner(accessPath, runner);
    });
  }

  peek(accessPath: Array<string>) {
    return accessPath.reduce((result, cur) => {
      return result.children[cur];
    }, this.node);
  }

  peekBaseValue(accessPath: Array<string>) {
    return accessPath.reduce((result, cur) => {
      return result[cur];
    }, this._base);
  }

  addEffects(runners: Array<Runner>, updateType: UPDATE_TYPE) {
    runners.forEach(runner => {
      this.pendingRunners.push({ runner, updateType });
    });
    runners.forEach(runner => runner.markDirty());
  }

  diff({
    path,
    value,
  }: {
    path: Array<string>;
    value: {
      [key: string]: any;
    };
  }): Array<PendingRunners> {
    const affectedNode = this.peek(path);
    const baseValue = this.peekBaseValue(path);

    if (!affectedNode) return [];

    this.compare(
      affectedNode,
      baseValue,
      value,
      (pathNode: PathNode, updateType?: UPDATE_TYPE) => {
        this.addEffects(
          pathNode.getEffects(),
          updateType || UPDATE_TYPE.BASIC_VALUE_CHANGE
        );
      }
    );
    const copy = this.pendingRunners.slice();
    this.pendingRunners = [];
    return copy;
  }

  compare(
    branch: PathNode,
    baseValue: {
      [key: string]: any;
    },
    nextValue: {
      [key: string]: any;
    },
    cb: {
      (pathNode: PathNode, updateType?: UPDATE_TYPE): void;
    }
  ) {
    const keysToCompare = Object.keys(branch.children);

    if (keysToCompare.indexOf('length') !== -1) {
      const oldValue = baseValue.length;
      const newValue = nextValue.length;

      if (newValue < oldValue) {
        cb(branch.children['length'], UPDATE_TYPE.ARRAY_LENGTH_CHANGE);
        return;
      }
    }

    if (branch.getType() === 'autoRun' && baseValue !== nextValue) {
      cb(branch);
    }

    keysToCompare.forEach(key => {
      const oldValue = baseValue[key];
      const newValue = nextValue[key];

      if (shallowEqual(oldValue, newValue)) return;

      if (isTypeEqual(oldValue, newValue)) {
        if (isPrimitive(newValue)) {
          if (oldValue !== newValue) {
            const type =
              key === 'length'
                ? UPDATE_TYPE.ARRAY_LENGTH_CHANGE
                : UPDATE_TYPE.BASIC_VALUE_CHANGE;
            cb(branch.children[key], type);
          }
        }

        if (isMutable(newValue)) {
          const childBranch = branch.children[key];
          this.compare(childBranch, oldValue, newValue, cb);
          return;
        }

        return;
      }
      cb(branch.children[key]);
    });
  }
}

export default PathTree;
