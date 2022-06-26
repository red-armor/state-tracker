import StateTrackerError from './StateTrackerError';

export default class Graph {
  public childrenMap: Map<string | number, Graph> = new Map();
  private slug: Array<string | number>;
  private _point: string | number;
  private _pathSet: Set<string> = new Set();

  constructor(point: string | number, slug: Array<string | number> = []) {
    this.slug = slug || [];
    this._point = point;
  }

  access(path: Array<string | number>) {
    const nextPath = path.slice();
    const pathString = nextPath.join('_');
    this._pathSet.add(pathString);

    const path0 = nextPath.shift() || '';

    if (path0 !== this.getPoint()) {
      throw new StateTrackerError(
        `access Path '${nextPath}' should be start with '${this.getPoint()}'`
      );
    }

    nextPath.reduce<{
      graph: Graph;
      slug: Array<string | number>;
      prev: string | number;
    }>(
      (acc, cur) => {
        const { graph, slug, prev } = acc;
        const nextSlug = slug.concat(prev);
        if ((cur || cur === 0) && !graph.childrenMap.has(cur)) {
          graph.childrenMap.set(cur, new Graph(cur, nextSlug));
        }

        return {
          graph: graph.childrenMap.get(cur)!,
          prev: cur,
          slug: nextSlug,
        };
      },
      {
        graph: this,
        slug: [],
        prev: path0,
      }
    );
  }

  getPath(): Array<string | number> {
    return this.slug.concat(this.getPoint());
  }

  getPaths() {
    return Array.from(this._pathSet).map(path => path.split('_'));
  }

  getPoint(): string | number {
    return this._point;
  }
}
