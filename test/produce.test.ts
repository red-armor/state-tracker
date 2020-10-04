import { TRACKER } from '../src/commons';
import produce from '../src/index.experimental';
import ProxyStateTracker from '../src/ProxyStateTracker';

const getTrackerId = (str: string): number => {
  const matched = str.match(/(\d*)$/);
  if (matched) return parseInt(matched[1]);
  return 0;
};

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

describe('return a proxy state with TRACKER prop', () => {
  it('If value is an object, then it should be a proxy state with TRACKER prop', () => {
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
    const ap = proxyState.a;
    const bp = proxyState.b;
    const b1p = proxyState.b.b1;

    expect(ap[TRACKER]).toEqual(expect.any(ProxyStateTracker));
    expect(bp[TRACKER]).toEqual(expect.any(ProxyStateTracker));
    expect(b1p[TRACKER]).toEqual(expect.any(ProxyStateTracker));
  });

  it('If value is an array, then it should be a proxy state with TRACKER prop', () => {
    const state = {
      a: [1, 2],
      b: [
        {
          b1: 1,
        },
      ],
    };

    const proxyState = produce(state);
    const ap = proxyState.a;
    const bp = proxyState.b;
    const b1p = proxyState.b[0];

    expect(ap[TRACKER]).toEqual(expect.any(ProxyStateTracker));
    expect(bp[TRACKER]).toEqual(expect.any(ProxyStateTracker));
    expect(b1p[TRACKER]).toEqual(expect.any(ProxyStateTracker));
  });
});

describe('change value', () => {
  it('Assigned with same object, state tracker will not be updated', () => {
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
    const id1 = getTrackerId(proxyState.a[TRACKER].id);
    proxyState.a = state.a;
    const id2 = getTrackerId(proxyState.a[TRACKER].id);
    expect(id1).toBe(id2);
  });

  it('Assigned with different object, state tracker id number will increment with 1', () => {
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
    const id1 = getTrackerId(proxyState.a[TRACKER].id);
    proxyState.a = {
      a1: 3,
      a2: 4,
    };
    const id2 = getTrackerId(proxyState.a[TRACKER].id);
    expect(id1).toBe(id2 - 1);
  });
});

describe('tracker id', () => {
  it('create tracker only if key is accessed', () => {
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
        b2: [2],
      },
    };
    const proxyState = produce(state);
    const id1 = getTrackerId(proxyState.b.b2[TRACKER].id);
    const id2 = getTrackerId(proxyState.b.b1[TRACKER].id);
    expect(id2).toBeGreaterThan(id1);
  });
});
