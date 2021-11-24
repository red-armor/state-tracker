import { produceImpl as ES5Produce } from '../src/es5';
import { produceImpl as ES6Produce } from '../src/proxy';
import StateTrackerUtil from '../src/StateTrackerUtil';
import when from '../src/when';

testTracker(true);
testTracker(false);

function testTracker(useProxy: boolean) {
  const produce = useProxy ? ES6Produce : ES5Produce;
  const decorateDesc = (text: string) =>
    useProxy ? `proxy: ${text}` : `es5: ${text}`;

  describe(decorateDesc('basic'), () => {
    it('clean if return true', () => {
      const state = {
        a: {
          a1: [{ value: 0 }, { value: 1 }],
          a2: 1,
        },
      };
      let count = 0;

      const proxyState = produce(state);
      when(proxyState, state => {
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
          enableRootComparison: false,
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
          enableRootComparison: false,
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
          enableRootComparison: false,
          afterCallback: () => (proxyState.a = nextA),
        }
      );

      expect(count).toBe(3);
    });

    it('predicate will be called only its watched variable value change', () => {
      const state = {
        a: {
          a1: [{ value: 0 }, { value: 1 }],
          a2: 1,
        },
      };
      let count = 0;

      const proxyState = produce(state);
      when(proxyState, state => {
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
          enableRootComparison: false,
          afterCallback: () => (proxyState.a = nextA),
        }
      );

      expect(count).toBe(2);

      nextA = {
        ...proxyState.a,
        a2: 2,
      };
      StateTrackerUtil.perform(
        proxyState,
        { a: nextA },
        {
          enableRootComparison: false,
          afterCallback: () => (proxyState.a = nextA),
        }
      );

      expect(count).toBe(2);

      nextA = {
        ...proxyState.a,
        a1: 3,
      };
      StateTrackerUtil.perform(
        proxyState,
        { a: nextA },
        {
          enableRootComparison: false,
          afterCallback: () => (proxyState.a = nextA),
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
          enableRootComparison: false,
          afterCallback: () => (proxyState.a = nextA),
        }
      );
      expect(count).toBe(3);

      nextA = {
        ...proxyState.a,
        a2: 3,
      };
      StateTrackerUtil.perform(
        proxyState,
        { a: nextA },
        {
          enableRootComparison: false,
          afterCallback: () => (proxyState.a = nextA),
        }
      );
      expect(count).toBe(3);
    });

    it('effect will be call when return true', () => {
      const state = {
        a: {
          a1: [{ value: 0 }, { value: 1 }],
          a2: 1,
        },
      };
      let count = 0;
      let finished = false;

      const proxyState = produce(state);
      when(
        proxyState,
        state => {
          count++;
          return state.a.a2 === 3;
        },
        () => {
          finished = true;
        }
      );

      let nextA = {
        ...proxyState.a,
        a2: 2,
      };
      StateTrackerUtil.perform(
        proxyState,
        { a: nextA },
        {
          enableRootComparison: false,
          afterCallback: () => (proxyState.a = nextA),
        }
      );

      expect(count).toBe(2);
      expect(finished).toBe(false);

      nextA = {
        ...proxyState.a,
        a2: 3,
      };
      StateTrackerUtil.perform(
        proxyState,
        { a: nextA },
        {
          enableRootComparison: false,
          afterCallback: () => (proxyState.a = nextA),
        }
      );
      expect(count).toBe(3);
      expect(finished).toBe(true);

      nextA = {
        ...proxyState.a,
        a2: 4,
      };
      StateTrackerUtil.perform(
        proxyState,
        { a: nextA },
        {
          enableRootComparison: false,
          afterCallback: () => (proxyState.a = nextA),
        }
      );
      expect(count).toBe(3);
      expect(finished).toBe(true);
    });
  });
}
