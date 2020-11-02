import { produce as ES6Produce } from '../src/proxy';

testTracker(true);

function testTracker(useProxy: boolean) {
  const produce = ES6Produce;
  // const produce = useProxy ? ES6Produce : ES5Produce;
  const decorateDesc = (text: string) =>
    useProxy ? `proxy: ${text}` : `es5: ${text}`;

  describe(decorateDesc('to simulate basic operations'), () => {
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
      proxyState.strictEnter('list');

      const trackerList = proxyState.a.a1.map((item: any) =>
        item.getTracker().getId()
      );
      proxyState.leave();
      const list = [...proxyState.a.a1];
      list[2] = { ...list[2] };

      proxyState.relink(['a'], { a1: list });
      proxyState.strictEnter('list');

      const nextTrackerList = proxyState.a.a1.map((item: any) =>
        item.getTracker().getId()
      );
      proxyState.leave();

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
      proxyState.strictEnter('list');

      const trackerList = proxyState.a.a1.map((item: any) =>
        item.getTracker().getId()
      );
      proxyState.leave();
      const list = [...state.a.a1];
      list[2] = { ...list[2] };

      proxyState.relink(['a'], { a1: list });
      proxyState.strictEnter('list');

      const nextTrackerList = proxyState.a.a1.map((item: any) =>
        item.getTracker().getId()
      );
      proxyState.leave();

      expect(nextTrackerList[0] === trackerList[0]).toBe(true);
      expect(nextTrackerList[1] === trackerList[1]).toBe(true);
      expect(nextTrackerList[2] === trackerList[2]).toBe(false);
      expect(nextTrackerList[3] === trackerList[3]).toBe(true);
    });
  });
}
