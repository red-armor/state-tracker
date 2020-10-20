import { TRACKER } from '../src/commons';
import { produce as ES5Produce } from '../src/es5';
import { produce as ES6Produce } from '../src/proxy';
import StateTracker from '../src/StateTracker';

testTracker(true);
testTracker(false);

const getTrackerId = (str: string): number => {
  const matched = str.match(/(\d*)$/);
  if (matched) return parseInt(matched[1]);
  return 0;
};

function testTracker(useProxy: boolean) {
  const produce = useProxy ? ES6Produce : ES5Produce;
  const decorateDesc = (text: string) =>
    useProxy ? `proxy: ${text}` : `es5: ${text}`;

  describe(decorateDesc('child proxies'), () => {
    it('Access a key which has object value will add prop to childProxies', () => {
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
        c: 3,
      };
      const proxyState = produce(state);
      const tracker = proxyState[TRACKER];

      expect(proxyState.a).toEqual({ a1: 1, a2: 2 });
      expect(proxyState.c).toEqual(3);
      const childProxies = tracker.getChildProxies();
      const keys = Object.keys(childProxies);
      expect(keys).toEqual(['a']);
    });

    it('Access a key which has array value will add prop to childProxies', () => {
      const state = {
        a: [2, 3, 4],
        b: {
          b1: {
            b11: 1,
            b12: 2,
          },
          b2: 2,
        },
        c: 3,
      };
      const proxyState = produce(state);
      const tracker = proxyState[TRACKER];

      expect(proxyState.a).toEqual([2, 3, 4]);
      expect(proxyState.c).toEqual(3);
      const childProxies = tracker.getChildProxies();
      const keys = Object.keys(childProxies);
      expect(keys).toEqual(['a']);
    });

    it('Set a key with different type value which will cause clear up childProxies', () => {
      const state = {
        a: [2, 3, 4],
        b: {
          b1: {
            b11: 1,
            b12: 2,
          },
          b2: 2,
        },
        c: 3,
      };
      const proxyState = produce(state);
      const tracker = proxyState.getTracker();

      expect(proxyState.a).toEqual([2, 3, 4]);
      expect(proxyState.c).toEqual(3);
      proxyState.a = { a1: 1 };
      const childProxies = tracker.getChildProxies();
      const keys = Object.keys(childProxies);
      expect(keys).toEqual([]);
    });

    it('childProxies will not update even if set to value with less keys than before', () => {
      const state = {
        a: [2, 3, 4],
        b: {
          b1: {
            b11: 1,
            b12: 2,
          },
          b2: 2,
        },
        c: 3,
      };
      const proxyState = produce(state);
      const tracker = proxyState.b.getTracker();

      expect(proxyState.b.b1).toEqual({ b11: 1, b12: 2 });
      expect(proxyState.c).toEqual(3);
      proxyState.b = { b1: 1 };
      const childProxies = tracker.getChildProxies();
      const keys = Object.keys(childProxies);
      expect(keys).toEqual(['b1']);
      expect(proxyState.b.b1).toEqual(1);
      const keys2 = Object.keys(childProxies);
      expect(keys2).toEqual([]);
    });
  });

  describe(decorateDesc('access path'), () => {
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
      expect(remarkable).toEqual([['a', 'a1'], ['a', 'a2'], ['a']]);
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
        ['b', 'b1', 'b11'],
        ['b', 'b1', 'b12'],
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
      expect(remarkable).toEqual([
        ['a', 'a1'],
        ['a', 'a2'],
        ['a'],
        ['b', 'b1'],
      ]);
      proxyState.leave();
    });
  });

  describe(decorateDesc('return a proxy state with TRACKER prop'), () => {
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

      expect(ap.getTracker()).toEqual(expect.any(StateTracker));
      expect(bp.getTracker()).toEqual(expect.any(StateTracker));
      expect(b1p.getTracker()).toEqual(expect.any(StateTracker));
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

      expect(ap.getTracker()).toEqual(expect.any(StateTracker));
      expect(bp.getTracker()).toEqual(expect.any(StateTracker));
      expect(b1p.getTracker()).toEqual(expect.any(StateTracker));
    });
  });

  describe(decorateDesc('change value'), () => {
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
      const id1 = getTrackerId(proxyState.a.getTracker().getId());
      proxyState.a = state.a;
      const id2 = getTrackerId(proxyState.a.getTracker().getId());
      expect(id1).toBe(id2);
    });

    it('update with different object, tracker id should be preserved, _updateTimes will increment with 1', () => {
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
      const id1 = getTrackerId(proxyState.a.getTracker().getId());

      proxyState.a = {
        a1: 3,
        a2: 4,
      };

      const id2 = getTrackerId(proxyState.a.getTracker().getId());
      expect(id1).toBe(id2);
      expect(proxyState.a.getTracker().getUpdateTimes()).toBe(1);

      proxyState.a = {
        a1: 3,
        a2: 4,
      };
      expect(proxyState.a.getTracker().getUpdateTimes()).toBe(2);
    });

    it('Tracker base value will be updated after try to access it value', () => {
      const old = {
        a1: 1,
        a2: 2,
      };
      const next = {
        a1: 3,
        a2: 4,
      };
      const state = {
        a: old,
      };
      const proxyState = produce(state);
      const tracker = proxyState.a.getTracker();

      proxyState.a = next;
      expect(tracker._base).toBe(old);
    });
  });

  describe(decorateDesc('tracker id'), () => {
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
      const id1 = getTrackerId(proxyState.b.b2.getTracker().getId());
      const id2 = getTrackerId(proxyState.b.b1.getTracker().getId());
      expect(id2).toBeGreaterThan(id1);
    });
  });

  describe(decorateDesc('relink'), () => {
    it('relink an object', () => {
      const state = {
        a: {
          a1: {
            a11: 2,
          },
          a2: {
            a21: 3,
          },
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
      /* eslint-disable */
      proxyState.a;
      proxyState.a.a1;
      proxyState.a.a2;
      /* eslint-enable */

      proxyState.relink(['a'], {
        a1: {
          a11: 3,
        },
        a2: 4,
      });

      const childProxies = proxyState['a'].getTracker().getChildProxies();
      expect(Object.keys(childProxies)).toEqual(['a1', 'a2']);
      expect(proxyState['a']['a2']).toBe(4);
      expect(Object.keys(childProxies)).toEqual(['a1']);

      proxyState.relink(['a'], {
        a1: 5,
        a2: 6,
      });
      expect(proxyState['a'].getTracker().getUpdateTimes()).toBe(2);
    });
  });

  describe(decorateDesc('proxy handler'), () => {
    it('symbol should not be reported', () => {
      const state = {
        a: {
          a1: 1,
        },
      };
      const proxyState = produce(state);
      /* eslint-disable */
      proxyState.enter()
      Object.prototype.toString.call(proxyState.a)
      /* eslint-enable */
      const trackerNode = proxyState.getContext().getCurrent();
      expect(trackerNode.getPaths()).toEqual([['a']]);
      proxyState.leave();
    });

    it('`isPeekingStrictly` to avoid getter loop', () => {
      type Item = { value: number };
      const state: { a: Array<Item> } = {
        a: [{ value: 1 }, { value: 2 }],
      };
      const proxyState = produce(state);
      proxyState.enter();
      proxyState.a
        .sort((a: Item, b: Item) => a.value - b.value)
        .filter((v: Item) => v.value > 1);
      proxyState.leave();
    });

    it('unConfigurable property should not be delete', () => {
      const state = {
        a: {
          a1: null,
        },
      };
      const proxyState = produce(state);
      proxyState.enter();
      proxyState.a.a1 = [{ a11: 1 }];
      proxyState.a.a1.map((v: any) => v.a11);
      proxyState.leave();
    });
  });

  describe(decorateDesc('operations'), () => {
    it('update an empty object', () => {
      // console.log('update -------')

      const model = {
        promotionInfo: {
          header: {
            presellDeposit: {},
          },
        },
      };

      const state = produce(model);

      state.enter('level1');
      const promotionInfo = state.peek(['promotionInfo']);
      const promotionInfoTracker = promotionInfo.getTracker();
      promotionInfoTracker.setContext('level1');
      const header = promotionInfo.header;

      state.enter('level2');
      expect(header.presellDeposit).toEqual({});

      state.leave();

      state.leave();

      state.relink(['promotionInfo'], {
        header: {
          presellDeposit: {
            deposit: 2,
            deduction: 3,
          },
        },
      });

      state.enter('level2');
      expect(header.presellDeposit.deposit).toEqual(2);
      expect(header.presellDeposit.deduction).toEqual(3);
      state.leave();
    });
  });
}
