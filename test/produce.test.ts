import { TRACKER, isProxy } from '../src/commons';
import { produceImpl as ES5Produce } from '../src/es5';
import { produceImpl as ES6Produce } from '../src/proxy';
import StateTrackerUtil from '../src/StateTrackerUtil';
import Reaction from '../src/Reaction';

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

  describe(decorateDesc('test report'), () => {
    it('constructor should not be reported', () => {
      const state = {
        a: {
          a1: [{ value: 0 }, { value: 1 }],
        },
      };
      const proxyState = produce(state);
      StateTrackerUtil.enter(proxyState);
      proxyState.a.a1.map((v: { value: number }, index: number) =>
        expect(v.value).toBe(index)
      );
      const trackerNode = StateTrackerUtil.getContext(proxyState).getCurrent();
      const paths = trackerNode.stateGraphMap.get('a')!.getPaths();

      expect(paths).toEqual([
        ['a'],
        ['a', 'a1'],
        ['a', 'a1', 'length'],
        ['a', 'a1', '0'],
        ['a', 'a1', '0', 'value'],
        ['a', 'a1', '1'],
        ['a', 'a1', '1', 'value'],
      ]);
      StateTrackerUtil.leave(proxyState);
    });

    it('Symbol(Symbol.toStringTag) should not be reported', () => {
      const state = {
        a: {
          a1: [{ value: 0 }, { value: 1 }],
        },
      };
      const proxyState = produce(state);
      StateTrackerUtil.enter(proxyState);
      expect(Object.prototype.toString.call(proxyState.a)).toEqual(
        '[object Object]'
      );
      const trackerNode = StateTrackerUtil.getContext(proxyState).getCurrent();
      const paths = trackerNode.stateGraphMap.get('a')!.getPaths();
      expect(paths).toEqual([['a']]);
      StateTrackerUtil.leave(proxyState);
    });

    it('length should be processed with tracker logic', () => {
      const model = {
        goods: {
          listData: [],
        },
      };

      const state = produce(model);

      StateTrackerUtil.enter(state, 'test');
      const {
        goods: { listData },
      } = state;
      expect(listData.length).toBe(0);
      StateTrackerUtil.leave(state);

      let nextGoods = {
        ...state.goods,
        listData: [{ id: '1' }, { id: '2' }],
      };
      StateTrackerUtil.perform(
        state,
        { a: nextGoods },
        {
          afterCallback: () => (state.goods = nextGoods),
          stateCompareLevel: 1,
        }
      );

      StateTrackerUtil.enter(state);
      const {
        goods: { listData: nextListData },
      } = state;

      expect(nextListData.length).toBe(2);
      StateTrackerUtil.leave(state);
    });
  });

  describe(decorateDesc('child proxies'), () => {
    it('Access a key with object value will add prop to childProxies', () => {
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
      const childProxies = tracker._nextChildProxies;

      expect(childProxies.has(state.a)).toBeTruthy();
      expect(childProxies.has(state.c)).toBeFalsy();
      expect(childProxies.size).toBe(1);
    });

    it('Access a key with array value will add prop to childProxies', () => {
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
      const childProxies = tracker._nextChildProxies;
      expect(childProxies.has(state.a)).toBeTruthy();
      expect(childProxies.has(state.c)).toBeFalsy();
      expect(childProxies.size).toBe(1);
    });

    it('Access a key with primitive value will not add prop to childProxies', () => {
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
      const tracker = StateTrackerUtil.getTracker(proxyState.b);
      expect(proxyState.c).toEqual(3);
      const childProxies = tracker._nextChildProxies;
      expect(childProxies.size).toBe(0);
    });

    it('Access a key with undefined value will not add prop to childProxies', () => {
      const state = {
        a: [2, 3, 4],
        b: {
          b1: {
            b11: 1,
            b12: 2,
          },
        },
        c: 3,
      };
      const proxyState = produce(state);
      const tracker = StateTrackerUtil.getTracker(proxyState.b);
      expect(proxyState.b.b2).toEqual(undefined);
      const childProxies = tracker._nextChildProxies;
      expect(childProxies.size).toBe(0);
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
      const tracker = StateTrackerUtil.getTracker(proxyState);

      expect(proxyState.a).toEqual([2, 3, 4]);
      expect(proxyState.c).toEqual(3);
      const childProxies = tracker._nextChildProxies;
      expect(childProxies.size).toBe(1);
      proxyState.a = { a1: 1 };
      const nextChildProxies = tracker._nextChildProxies;

      expect(nextChildProxies.size).toBe(0);
    });

    it('childProxies key will be deleted after set with new value', () => {
      const list = [
        {
          v: 1,
        },
        {
          v: 2,
        },
        {
          v: 3,
        },
      ];

      const state = {
        a: [2, 3, 4],
        b: {
          list: list,
          b1: 3,
        },
        c: 3,
      };
      const proxyState = produce(state);
      expect(proxyState.b.list).toEqual(list);
      const tracker = StateTrackerUtil.getTracker(proxyState);
      const childProxies = tracker._nextChildProxies;
      expect(childProxies.size).toBe(1);

      proxyState.b = { b1: [1] };

      expect(childProxies.size).toBe(0);
    });

    it('reuse array trackerable item', () => {
      const list = [
        {
          v: 1,
        },
        {
          v: 2,
        },
        {
          v: 3,
        },
      ];

      const state = {
        a: [2, 3, 4],
        b: {
          list,
          b1: 3,
        },
        c: 3,
      };

      const proxyState = produce(state);
      expect(proxyState.b.list[0].v).toEqual(1);
      expect(proxyState.b.list[1].v).toEqual(2);
      expect(proxyState.b.list[2].v).toEqual(3);

      const list_1_tracker = StateTrackerUtil.getTracker(proxyState.b.list);
      const list_1_0_tracker = StateTrackerUtil.getTracker(
        proxyState.b.list[0]
      );
      const list_1_1_tracker = StateTrackerUtil.getTracker(
        proxyState.b.list[1]
      );
      const list_1_2_tracker = StateTrackerUtil.getTracker(
        proxyState.b.list[2]
      );

      proxyState.b.list = list.slice();

      const list_2_tracker = StateTrackerUtil.getTracker(proxyState.b.list);
      const list_2_0_tracker = StateTrackerUtil.getTracker(
        proxyState.b.list[0]
      );
      const list_2_1_tracker = StateTrackerUtil.getTracker(
        proxyState.b.list[1]
      );
      const list_2_2_tracker = StateTrackerUtil.getTracker(
        proxyState.b.list[2]
      );

      expect(list_1_tracker._id).not.toEqual(list_2_tracker._id);
      expect(list_1_0_tracker).toBe(list_2_0_tracker);
      expect(list_1_1_tracker).toBe(list_2_1_tracker);
      expect(list_1_2_tracker).toBe(list_2_2_tracker);

      expect(proxyState.b.list[0].v).toEqual(1);
      expect(proxyState.b.list[1].v).toEqual(2);
      expect(proxyState.b.list[2].v).toEqual(3);
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
      StateTrackerUtil.enter(proxyState);
      /* eslint-disable */
      proxyState.a;
      proxyState.a.a1;
      proxyState.a.a2;
      /* eslint-enable */

      const trackerNode = StateTrackerUtil.getContext(proxyState).getCurrent();
      const paths = trackerNode.stateGraphMap.get('a')!.getPaths();
      expect(paths).toEqual([['a'], ['a', 'a1'], ['a', 'a2']]);
      StateTrackerUtil.leave(proxyState);
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
      StateTrackerUtil.enter(proxyState);
      /* eslint-disable */
      proxyState.a;
      proxyState.a.a1;
      proxyState.a.a2;

      const b = proxyState.b.b1
      StateTrackerUtil.enter(proxyState)
      b.b11
      b.b12

      const subNode = StateTrackerUtil.getContext(b).getCurrent()
      // const subPaths = subNode.getPaths()
      const subPaths = subNode.stateGraphMap.get('b')!.getPaths()
      expect(subPaths).toEqual([
        ['b', 'b1', 'b11'],
        ['b', 'b1', 'b12'],
      ])
      StateTrackerUtil.leave(proxyState)
      /* eslint-enable */

      const trackerNode = StateTrackerUtil.getContext(proxyState).getCurrent();
      const apaths = trackerNode.stateGraphMap.get('a')!.getPaths();
      expect(apaths).toEqual([['a'], ['a', 'a1'], ['a', 'a2']]);
      const bpaths = trackerNode.stateGraphMap.get('b')!.getPaths();
      expect(bpaths).toEqual([['b'], ['b', 'b1']]);
      StateTrackerUtil.leave(proxyState);
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
      const id1 = getTrackerId(StateTrackerUtil.getTracker(proxyState.a)._id);
      proxyState.a = state.a;
      const id2 = getTrackerId(StateTrackerUtil.getTracker(proxyState.a)._id);
      expect(id1).toBe(id2);
    });

    it('Set with different value will create new tracker', () => {
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
      const id1 = getTrackerId(StateTrackerUtil.getTracker(proxyState.a)._id);

      proxyState.a = {
        a1: 3,
        a2: 4,
      };
      expect(proxyState.a.a1).toBe(3);

      const id2 = getTrackerId(StateTrackerUtil.getTracker(proxyState.a)._id);
      expect(id1 + 1).toBe(id2);
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
      const tracker = StateTrackerUtil.getTracker(proxyState.a);

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
      const id1 = getTrackerId(
        StateTrackerUtil.getTracker(proxyState.b.b2)._id
      );
      const id2 = getTrackerId(
        StateTrackerUtil.getTracker(proxyState.b.b1)._id
      );
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

      let nextA = {
        a1: {
          a11: 3,
        },
        a2: 4,
      };
      StateTrackerUtil.perform(
        proxyState,
        { a: nextA },
        {
          afterCallback: () => (proxyState.a = nextA),
          stateCompareLevel: 1,
        }
      );

      expect(proxyState.a.a2).toBe(4);

      nextA = {
        // @ts-ignore
        a1: 5,
        a2: 6,
      };
      StateTrackerUtil.perform(
        proxyState,
        { a: nextA },
        {
          afterCallback: () => (proxyState.a = nextA),
          stateCompareLevel: 1,
        }
      );

      expect(proxyState.a.a1).toBe(5);
      expect(proxyState.a.a2).toBe(6);
    });

    it('batchRelink will return a draft object', () => {
      const state = {
        a: {
          a1: {
            a11: 1,
          },
          a2: {
            a21: 4,
          },
        },
        b: {
          b1: 2,
        },
      };

      const proxyState = produce(state);

      let nextA = {
        ...proxyState.a,
        a1: {
          a11: 3,
        },
      };
      StateTrackerUtil.perform(
        proxyState,
        { ...proxyState, a: nextA },
        {
          afterCallback: () => (proxyState.a = nextA),
          stateCompareLevel: 1,
        }
      );

      // expect(proxyState.a.a1.a11).toBe(1);
      expect(proxyState.a.a1.a11).toBe(3);
      proxyState.b.b1 = 4;
      expect(proxyState.b.b1).toBe(4);
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
      StateTrackerUtil.enter(proxyState)
      Object.prototype.toString.call(proxyState.a)
      /* eslint-enable */
      const trackerNode = StateTrackerUtil.getContext(proxyState).getCurrent();
      const paths = trackerNode.stateGraphMap.get('a')!.getPaths();
      expect(paths).toEqual([['a']]);
      StateTrackerUtil.leave(proxyState);
    });

    it('`isPeekingStrictly` to avoid getter loop', () => {
      type Item = { value: number };
      const state: { a: Array<Item> } = {
        a: [{ value: 1 }, { value: 2 }],
      };
      const proxyState = produce(state);
      StateTrackerUtil.enter(proxyState);
      proxyState.a
        .sort((a: Item, b: Item) => a.value - b.value)
        .filter((v: Item) => v.value > 1);
      StateTrackerUtil.leave(proxyState);
    });

    it('unConfigurable property should not be delete', () => {
      const state = {
        a: {
          a1: null,
        },
      };
      const proxyState = produce(state);
      StateTrackerUtil.enter(proxyState);
      proxyState.a.a1 = [{ a11: 1 }];
      proxyState.a.a1.map((v: any) => v.a11);
      StateTrackerUtil.leave(proxyState);
    });
  });

  describe(decorateDesc('operations'), () => {
    it('If retryProxy exist, childProxies[prop] base should be update', () => {
      const model = {
        promotionInfo: {
          header: {
            presellDeposit: {},
          },
        },
      };

      const state = produce(model);

      StateTrackerUtil.enter(state, 'level1');
      const promotionInfo = StateTrackerUtil.peek(state, ['promotionInfo']);
      let header = promotionInfo.header;

      StateTrackerUtil.enter(state, 'level2');
      StateTrackerUtil.leave(state);
      StateTrackerUtil.leave(state);

      let nextPromotionInfo = {
        ...state.promotionInfo,
        header: {
          presellDeposit: {
            deposit: 2,
            deduction: 3,
          },
        },
      };
      StateTrackerUtil.perform(
        state,
        { promotionInfo: nextPromotionInfo },
        {
          afterCallback: () => (state.promotionInfo = nextPromotionInfo),
          stateCompareLevel: 1,
        }
      );

      StateTrackerUtil.enter(state, 'level2');
      header = StateTrackerUtil.peek(state, ['promotionInfo', 'header']);
      expect(header.presellDeposit.deposit).toEqual(2);
      expect(header.presellDeposit.deduction).toEqual(3);
      StateTrackerUtil.leave(state);
    });

    it('update an array value', () => {
      const model = {
        goods: {
          listData: [],
        },
      };

      const state = produce(model);

      StateTrackerUtil.enter(state, 'test');
      const {
        goods: { listData },
      } = state;
      expect(listData.length).toBe(0);
      StateTrackerUtil.leave(state);

      let nextGoods = {
        ...state.goods,
        listData: [{ id: '1' }, { id: '2' }],
      };
      StateTrackerUtil.perform(
        state,
        { a: nextGoods },
        {
          afterCallback: () => (state.goods = nextGoods),
          stateCompareLevel: 1,
        }
      );

      StateTrackerUtil.enter(state);
      const {
        goods: { listData: nextListData },
      } = state;
      expect(nextListData.length).toBe(2);
      StateTrackerUtil.leave(state);

      let count = 0;

      StateTrackerUtil.enter(state, 'goods');
      const info = StateTrackerUtil.peek(state, ['goods']);
      info.listData.map(() => count++);

      expect(count === 2).toBe(true);
    });

    it('update an empty object', () => {
      const model = {
        promotionInfo: {
          header: {
            presellDeposit: {},
          },
        },
      };

      const state = produce(model);

      StateTrackerUtil.enter(state, 'level1');
      const promotionInfo = StateTrackerUtil.peek(state, ['promotionInfo']);
      let header = promotionInfo.header;

      StateTrackerUtil.enter(state, 'level2');
      expect(header.presellDeposit).toEqual({});

      StateTrackerUtil.leave(state);

      StateTrackerUtil.leave(state);

      let nextPromotionInfo = {
        ...state.promotionInfo,
        header: {
          presellDeposit: {
            deposit: 2,
            deduction: 3,
          },
        },
      };
      StateTrackerUtil.perform(
        state,
        { promotionInfo: nextPromotionInfo },
        {
          afterCallback: () => (state.promotionInfo = nextPromotionInfo),
          stateCompareLevel: 1,
        }
      );

      StateTrackerUtil.enter(state, 'level2');
      header = StateTrackerUtil.peek(state, ['promotionInfo', 'header']);
      const presellDeposit = header.presellDeposit;
      expect(presellDeposit.deposit).toEqual(2);
      expect(presellDeposit.deduction).toEqual(3);
      StateTrackerUtil.leave(state);
    });
  });

  describe(decorateDesc('test backward access'), () => {
    it('Basically, access an outer variable will not trigger backward access.', () => {
      const model = {
        promotionInfo: {
          header: {
            presellDeposit: {},
            price: 3,
            selected: false,
          },
        },
      };

      const state = produce(model);

      StateTrackerUtil.enter(state, 'level1');
      const promotionInfo = StateTrackerUtil.peek(state, ['promotionInfo']);
      const header = promotionInfo.header;
      StateTrackerUtil.enter(state, 'level2');
      expect(header.price).toBe(3);
      StateTrackerUtil.leave(state);
      StateTrackerUtil.leave(state);
    });

    it('Destructor an object will trigger an backward access', () => {
      const model = {
        promotionInfo: {
          header: {
            presellDeposit: {},
            price: 3,
            selected: false,
          },
        },
      };

      const state = produce(model);

      StateTrackerUtil.enter(state, 'level1');
      const promotionInfo = StateTrackerUtil.peek(state, ['promotionInfo']);
      let header = promotionInfo.header;
      StateTrackerUtil.leave(state);

      let nextPromotionInfo = {
        ...state.promotionInfo,
        header: {
          presellDeposit: {
            deposit: 2,
            deduction: 3,
          },
          price: 6,
          selected: true,
        },
      };
      StateTrackerUtil.perform(
        state,
        { promotionInfo: nextPromotionInfo },
        {
          afterCallback: () => (state.promotionInfo = nextPromotionInfo),
          stateCompareLevel: 1,
        }
      );

      StateTrackerUtil.enter(state, 'level2');
      header = StateTrackerUtil.peek(state, ['promotionInfo', 'header']);
      expect(header.presellDeposit.deposit).toBe(2);
      const { presellDeposit, price, selected } = header;
      expect(presellDeposit).toEqual({ deposit: 2, deduction: 3 });
      expect(price).toBe(6);
      expect(selected).toBe(true);
      expect(presellDeposit.deposit).toBe(2);
    });

    it('mask is used to optimize backward access times', () => {
      const model = {
        promotionInfo: {
          header: {
            presellDeposit: {},
            price: 3,
            selected: false,
          },
        },
      };

      const state = produce(model);

      StateTrackerUtil.enter(state, 'level1');
      const promotionInfo = StateTrackerUtil.peek(state, ['promotionInfo']);
      let header = promotionInfo.header;
      StateTrackerUtil.leave(state);

      let nextPromotionInfo = {
        ...state.promotionInfo,
        header: {
          presellDeposit: {
            deposit: 2,
            deduction: 3,
          },
          price: 6,
          selected: true,
        },
      };
      StateTrackerUtil.perform(
        state,
        { promotionInfo: nextPromotionInfo },
        {
          afterCallback: () => (state.promotionInfo = nextPromotionInfo),
          stateCompareLevel: 1,
        }
      );

      StateTrackerUtil.enter(state, 'level2');
      header = StateTrackerUtil.peek(state, ['promotionInfo', 'header']);
      expect(header.presellDeposit.deposit).toBe(2);
      const { presellDeposit, price, selected } = header;
      expect(presellDeposit).toEqual({ deposit: 2, deduction: 3 });
      expect(price).toBe(6);
      expect(selected).toBe(true);

      expect(presellDeposit.deposit).toBe(2);
      expect(presellDeposit.deduction).toBe(3);
    });
  });

  describe(decorateDesc('description'), () => {
    it('not extensible object, should not be proxied', () => {
      const state = {};
      const a = Object.defineProperty({}, 'current', {
        writable: true,
        configurable: true,
        value: 3,
      });
      Object.defineProperty(state, 'a', {
        writable: true,
        configurable: true,
        value: a,
      });

      // @ts-ignore
      Object.preventExtensions(state.a);

      const proxyState = produce(state);
      expect(proxyState.a.current).toBe(3);
      expect(isProxy(proxyState.a)).toBe(false);
    });
  });

  // TODO dynamic add state props
  describe(decorateDesc('dynamic props'), () => {
    it("es5 will not react to undefined key's value change", () => {
      const state = {
        app: {
          list: [{ id: 1, label: 'first' }],
          location: {
            city: 'shanghai',
          },
          title: 'current',
          description: 'testing',
        },
      };
      const proxyState = produce(state);
      let count = 0;
      let value;

      const getState = () => proxyState;

      new Reaction({
        fn: ({ getState }: { getState: Function }) => {
          const state = getState();
          const stc = StateTrackerUtil.getContext(state);
          const stn = stc.getCurrent();
          const reaction = stn.getReaction();
          try {
            count++;
            value = state.content.name;
            reaction?.setStateCompareLevel(1);
          } catch (err) {
            reaction?.setStateCompareLevel(0);
          }
        },
        state: proxyState,
        scheduler: (fn: Function) => {
          fn({ getState });
        },
      });

      expect(count).toBe(1);
      expect(value).toBe(undefined);

      let content = { name: 'name' };

      StateTrackerUtil.perform(
        proxyState,
        {
          ...proxyState,
          content,
        },
        {
          afterCallback: () => {
            proxyState.content = content;
          },
        }
      );

      if (useProxy) {
        expect(count).toBe(2);
        expect(value).toBe('name');
      } else {
        expect(count).toBe(1);
        expect(value).toBe(undefined);
      }
    });
    it('es5 should be declare first', () => {
      const state = {
        app: {
          list: [{ id: 1, label: 'first' }],
          location: {
            city: 'shanghai',
          },
          title: 'current',
          description: 'testing',
        },
        content: undefined,
      };
      const proxyState = produce(state);
      let count = 0;
      let value;

      const getState = () => proxyState;

      new Reaction({
        fn: ({ getState }: { getState: Function }) => {
          const state = getState();
          const stc = StateTrackerUtil.getContext(state);
          const stn = stc.getCurrent();
          const reaction = stn.getReaction();
          try {
            count++;
            value = state.content.name;
            reaction?.setStateCompareLevel(1);
          } catch (err) {
            reaction?.setStateCompareLevel(0);
          }
        },
        state: proxyState,
        scheduler: (fn: Function) => {
          fn({ getState });
        },
      });

      expect(count).toBe(1);
      expect(value).toBe(undefined);

      let content = { name: 'name' };

      StateTrackerUtil.perform(
        proxyState,
        {
          ...proxyState,
          content,
        },
        {
          afterCallback: () => {
            proxyState.content = content;
          },
        }
      );

      expect(count).toBe(2);
      expect(value).toBe('name');
    });
  });
}
