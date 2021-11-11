import StateTrackerError from './StateTrackerError';

export class Graph {
  public childrenMap: {
    [key: string]: Graph;
  };
  private slug: Array<string>;
  private _point: string;
  private _pathSet: Set<string>;

  constructor(point: string, slug: Array<string> = []) {
    this.childrenMap = {};
    this.slug = slug || [];
    this._point = point;

    this._pathSet = new Set();
  }

  access(path: Array<string>) {
    const pathString = path.join('_');
    this._pathSet.add(pathString);

    const path0 = path.shift() || '';

    if (path0 !== this.getPoint()) {
      throw new StateTrackerError(
        `access Path '${path}' should be start with '${this.getPoint()}'`
      );
    }

    path.reduce<{
      graph: Graph;
      slug: Array<string>;
      prev: string;
    }>(
      (acc, cur) => {
        const { graph, slug, prev } = acc;
        const nextSlug = slug.concat(prev);
        if (cur && !graph.childrenMap[cur]) {
          graph.childrenMap[cur] = new Graph(cur, nextSlug);
        }

        return {
          graph: graph.childrenMap[cur],
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

  getPath(): Array<string> {
    return this.slug.concat(this.getPoint());
  }

  getPaths() {
    return Array.from(this._pathSet).map(path => path.split('_'));
  }

  getPoint(): string {
    return this._point;
  }
}
