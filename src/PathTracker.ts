class PathTracker {
  private _path: Array<string>;

  constructor(props: { path: Array<string> }) {
    this._path = props.path;
  }

  getPath() {
    return this._path;
  }

  update(accessPath: Array<string>) {
    this._path = accessPath;
  }
}

export default PathTracker;
