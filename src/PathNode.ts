import { AccessPath, PathNodeChildren, PathNodeProps } from './types';
import Runner from './Runner';

class PathNode {
  private _parent?: PathNode;
  private _type: string;
  private _prop: string;
  private _effects: Array<Runner>;
  public children: PathNodeChildren;

  constructor(options: PathNodeProps) {
    const { parent, type, prop } = options;
    this._parent = parent;
    this.children = {};
    this._type = type;
    this._prop = prop;
    this._effects = [];
  }

  getType() {
    return this._type;
  }

  getParent() {
    return this._parent;
  }

  getProp() {
    return this._prop;
  }

  getEffects() {
    return this._effects;
  }

  addRunner(path: AccessPath, runner: Runner) {
    try {
      const len = path.length;
      path.reduce<PathNode>((node: PathNode, cur: string, index: number) => {
        // path中前面的值都是为了让我们定位到最后的需要关心的位置
        if (!node.children[cur])
          node.children[cur] = new PathNode({
            type: this._type,
            prop: cur,
            parent: node,
          });
        // 只有到达`path`的最后一个`prop`时，才会进行patcher的添加
        if (index === len - 1) {
          runner.addRemover(() => {
            const index = this._effects.indexOf(runner);

            if (index !== -1) {
              this._effects.splice(index, 1);
            }
          });
        }
        return node.children[cur];
      }, this);
    } catch (err) {
      // console.log('err ', err)
    }
  }
}

export default PathNode;
