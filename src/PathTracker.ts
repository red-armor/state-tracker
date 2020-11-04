class PathTracker {
  private _path: Array<string>;

  constructor(props: { path: Array<string> }) {
    this._path = props.path;
  }

  getPath() {
    return this._path;
  }
}

export default PathTracker;
