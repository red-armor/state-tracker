import produce from '../src/index.experimental';

describe('access path', () => {
  it('verify getPaths', () => {
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

  it('verify getPaths: nested props', () => {
    const state = {
      a: {
        a1: 1,
        a2: 2,
      },
      b: {
        b1: {
          b11: 1,
          b12: 2,
        },
        b2: 2,
      },
    };
    const proxyState = produce(state);
    proxyState.enter();
    /* eslint-disable */
    proxyState.a;
    proxyState.a.a1;
    proxyState.a.a2;

    const b = proxyState.b.b1
    proxyState.enter()
    b.b11
    b.b12

    const subNode = b.getContext().getCurrent()
    const subPaths = subNode.getPaths()
    const subRemarkable = subNode.getRemarkable()
    expect(subPaths).toEqual([
      ['b', 'b1', 'b11'],
      ['b', 'b1', 'b12'],
    ])
    expect(subRemarkable).toEqual([
      ['b', 'b1', 'b12'],
      ['b', 'b1', 'b11'],
    ])
    proxyState.leave()
    /* eslint-enable */

    const trackerNode = proxyState.getContext().getCurrent();
    const paths = trackerNode.getPaths();
    expect(paths).toEqual([
      ['a'],
      ['a'],
      ['a', 'a1'],
      ['a'],
      ['a', 'a2'],
      ['b'],
      ['b', 'b1'],
    ]);
    const remarkable = trackerNode.getRemarkable();
    expect(remarkable).toEqual([['b', 'b1'], ['a', 'a2'], ['a', 'a1'], ['a']]);
    proxyState.leave();
  });
});
