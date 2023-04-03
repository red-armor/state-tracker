import { produceImpl as ES5Produce } from '../src/es5';
import { produceImpl as ES6Produce } from '../src/proxy';
import StateTrackerUtil from '../src/StateTrackerUtil';
import { watch } from '../src/index';

testTracker(true);
testTracker(false);

function testTracker(useProxy: boolean) {
  const produce = useProxy ? ES6Produce : ES5Produce;
  const decorateDesc = (text: string) =>
    useProxy ? `proxy: ${text}` : `es5: ${text}`;

  describe(decorateDesc('basic'), () => {
    it('fn will be called on every relink function', () => {
      const state = {
        a: {
          a1: [{ value: 0 }, { value: 1 }],
          a2: 1,
        },
      };
      let count = 0;

      const proxyState = produce(state);
      watch(proxyState, (state: any) => {
        count++;
        return state.a.a2 === 3;
      });

      let nextA = {
        ...proxyState.a,
        a2: 2,
      };
      StateTrackerUtil.perform(
        proxyState,
        { a: nextA },
        {
          afterCallback: () => (proxyState.a = nextA),
          stateCompareLevel: 1,
        }
      );

      expect(count).toBe(2);

      nextA = {
        ...proxyState.a,
        a2: 3,
      };
      StateTrackerUtil.perform(
        proxyState,
        { a: nextA },
        {
          afterCallback: () => (proxyState.a = nextA),
          stateCompareLevel: 1,
        }
      );
      expect(count).toBe(3);

      nextA = {
        ...proxyState.a,
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
      expect(count).toBe(4);
    });
  });
}
