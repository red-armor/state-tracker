import produce from '../src/index.experimental';

describe('access path', () => {
  it('works', () => {
    const state = {
      a: {
        a1: 1,
        a2: 2,
      },
      b: {
        b1: 1,
        b2: 2,
      },
    };
    const proxyState = produce(state);
    proxyState.enter();
    /* eslint-disable */
    proxyState.a;
    proxyState.a.a1;
    proxyState.a.a2;
    /* eslint-enable */

    const trackerNode = proxyState.getContext().getCurrent();
    const paths = trackerNode.getPaths();
    expect(paths).toEqual([['a'], ['a'], ['a', 'a1'], ['a'], ['a', 'a2']]);
    const remarkable = trackerNode.getRemarkable();
    expect(remarkable).toEqual([['a', 'a2'], ['a', 'a1'], ['a']]);
    proxyState.leave();
  });
});
