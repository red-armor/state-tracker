import PathNode from '../PathNode';

export type PathNodeProps = {
  parent?: PathNode;
  prop: string;
  type: string;
};

export type PathNodeChildren = {
  [key: string]: PathNode;
};
