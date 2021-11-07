import { produce as ES6Produce } from '../src/proxy';
import { produce as ES5Produce } from '../src/es5';
import StateTrackerUtil from '../src/StateTrackerUtil';

testTracker(true);
testTracker(false);

function testTracker(useProxy: boolean) {
  const produce = useProxy ? ES6Produce : ES5Produce;
  const decorateDesc = (text: string) =>
    useProxy ? `proxy: ${text}` : `es5: ${text}`;

  describe(decorateDesc('Simulate basic operations'), () => {
    /**
     * Because Proxy is not equal with basic object, proxyState always return
     * a Proxy object. when attempt to reuse childProxy, it may cause unexpected result.
     *
     *  if (!childProxyTracker && childProxy) {
     *     childProxyTracker = childProxy[TRACKER];
     *     const childProxyBase = childProxyTracker.getBase();
     *     if (
     *       childProxyBase === value ||
     *       (isObject(value) &&
     *         value.getTracker &&
     *         childProxyBase === value.getTracker().getBase())
     *     ) {
     *       if (tracker._context)
     *         childProxyTracker.setContext(tracker._context);
     *       childProxy.getTracker().setMask(trackerMask);
     *       return childProxy;
     *     }
     *   }
     *
     * In source code, `childProxyBase === value` is not sufficient.
     */
    it('partial update: use proxy state as source data', () => {
      const state = {
        a: {
          a1: [{ value: 0 }, { value: 1 }, { value: 2 }, { value: 3 }],
        },
      };

      const proxyState = produce(state);
      StateTrackerUtil.enter(proxyState, 'list');

      const trackerList = proxyState.a.a1.map(
        (item: any) => StateTrackerUtil.getTracker(item)._id
      );
      StateTrackerUtil.leave(proxyState);
      const list = [...proxyState.a.a1];
      list[2] = { ...list[2] };

      StateTrackerUtil.relink(proxyState, ['a'], { a1: list });
      StateTrackerUtil.enter(proxyState, 'list');

      const nextTrackerList = proxyState.a.a1.map(
        (item: any) => StateTrackerUtil.getTracker(item)._id
      );
      StateTrackerUtil.leave(proxyState);

      expect(nextTrackerList[0] === trackerList[0]).toBe(true);
      expect(nextTrackerList[1] === trackerList[1]).toBe(true);
      expect(nextTrackerList[2] === trackerList[2]).toBe(false);
      expect(nextTrackerList[3] === trackerList[3]).toBe(true);
    });

    it('partial update: the correct way', () => {
      const state = {
        a: {
          a1: [{ value: 0 }, { value: 1 }, { value: 2 }, { value: 3 }],
        },
      };

      const proxyState = produce(state);
      StateTrackerUtil.enter(proxyState, 'list');

      const trackerList = proxyState.a.a1.map(
        (item: any) => StateTrackerUtil.getTracker(item)._id
      );
      StateTrackerUtil.leave(proxyState);

      const list = [...state.a.a1];
      list[2] = { ...list[2] };

      StateTrackerUtil.relink(proxyState, ['a'], { a1: list });
      StateTrackerUtil.enter(proxyState, 'list');

      const nextTrackerList = proxyState.a.a1.map(
        (item: any) => StateTrackerUtil.getTracker(item)._id
      );
      StateTrackerUtil.leave(proxyState);

      expect(nextTrackerList[0] === trackerList[0]).toBe(true);
      expect(nextTrackerList[1] === trackerList[1]).toBe(true);
      expect(nextTrackerList[2] === trackerList[2]).toBe(false);
      expect(nextTrackerList[3] === trackerList[3]).toBe(true);
    });

    it('remove an item', () => {
      const state = {
        a: {
          a1: [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
        },
      };

      const proxyState = produce(state);
      StateTrackerUtil.enter(proxyState, 'list');
      const a = StateTrackerUtil.peek(proxyState, ['a']);
      const data = a.a1;

      StateTrackerUtil.enter(proxyState, 'item0');
      expect(data[0].id).toBe(0);
      const tracker_0_id = StateTrackerUtil.getTracker(data[0])._id;
      StateTrackerUtil.leave(proxyState);
      StateTrackerUtil.enter(proxyState, 'item1');
      expect(data[1].id).toBe(1);
      const tracker_1_id = StateTrackerUtil.getTracker(data[1])._id;
      StateTrackerUtil.leave(proxyState);
      StateTrackerUtil.enter(proxyState, 'item2');
      expect(data[2].id).toBe(2);
      StateTrackerUtil.leave(proxyState);
      StateTrackerUtil.enter(proxyState, 'item3');
      expect(data[3].id).toBe(3);
      const tracker_3_id = StateTrackerUtil.getTracker(data[3])._id;
      StateTrackerUtil.leave(proxyState);
      StateTrackerUtil.enter(proxyState, 'item4');
      expect(data[4].id).toBe(4);
      const tracker_4_id = StateTrackerUtil.getTracker(data[4])._id;
      StateTrackerUtil.leave(proxyState);

      const newData = state.a.a1.slice();
      newData.splice(2, 1);
      // proxyState.relink(['a'], {
      //   a1: newData,
      // })
      proxyState.a.a1 = newData;

      StateTrackerUtil.enter(proxyState, 'list');
      const nextData = StateTrackerUtil.peek(proxyState, ['a']).a1;

      StateTrackerUtil.enter(proxyState, 'item0');
      expect(nextData[0].id).toBe(0);
      const tracker_0_id_next = StateTrackerUtil.getTracker(nextData[0])._id;
      expect(tracker_0_id_next).toBe(tracker_0_id);
      StateTrackerUtil.leave(proxyState);
      StateTrackerUtil.enter(proxyState, 'item1');
      expect(nextData[1].id).toBe(1);
      const tracker_1_id_next = StateTrackerUtil.getTracker(nextData[1])._id;
      expect(tracker_1_id_next).toBe(tracker_1_id);
      StateTrackerUtil.leave(proxyState);
      StateTrackerUtil.enter(proxyState, 'item2');
      expect(nextData[2].id).toBe(3);
      const tracker_2_id_next = StateTrackerUtil.getTracker(nextData[2])._id;
      expect(tracker_2_id_next).toBe(tracker_3_id);
      StateTrackerUtil.leave(proxyState);
      StateTrackerUtil.enter(proxyState, 'item3');
      expect(nextData[3].id).toBe(4);
      const tracker_3_id_next = StateTrackerUtil.getTracker(nextData[3])._id;
      expect(tracker_3_id_next).toBe(tracker_4_id);
      StateTrackerUtil.leave(proxyState);
    });
  });
}
