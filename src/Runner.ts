import { isFunction } from './commons';
import { AccessPath } from './types';

class Runner {
  private _accessPaths: Array<AccessPath>;
  private _autoRun: Function;
  private _removers: Array<Function>;

  constructor(props: { accessPaths?: Array<AccessPath>; autoRun: Function }) {
    const { accessPaths, autoRun } = props;
    this._accessPaths = accessPaths || [];
    this._autoRun = autoRun;
    this._removers = [];
  }

  getAccessPaths() {
    return this._accessPaths;
  }

  updateAccessPaths(accessPaths: Array<AccessPath>) {
    this._accessPaths = accessPaths;
    if (this._removers.length) this.teardown();
  }

  // 将patcher从PathNode上删除
  teardown() {
    this._removers.forEach(remover => remover());
    this._removers = [];
  }

  markDirty() {
    this.teardown();
  }

  addRemover(remove: Function) {
    this._removers.push(remove);
  }

  run() {
    if (isFunction(this._autoRun)) this._autoRun();
  }
}

export default Runner;
