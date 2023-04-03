import Graph from '../src/Graph';
import StateTrackerError from '../src/StateTrackerError';

describe('Graph', () => {
  it('Graph will created', () => {
    const paths: any = [['app'], ['app', 'title'], ['app', 'description']];
    const graph = new Graph('app');
    paths.forEach((path: string[]) => graph?.access(path));
    expect(graph.getPoint()).toBe('app');
    expect(graph.getPaths()).toEqual([
      ['app'],
      ['app', 'title'],
      ['app', 'description'],
    ]);
    expect(graph.getPath()).toEqual(['app']);
  });

  it('Graph will created', () => {
    try {
      const paths: any = [[], []];
      const graph = new Graph('app');
      paths.forEach((path: string[]) => graph?.access(path));
      expect(graph.getPoint()).toBe('app');
      expect(true).toBe(false);
    } catch (e) {
      const error = new StateTrackerError(
        `access Path '' should be start with 'app'`
      );
      expect(e).toStrictEqual(error);
    }
  });
});
