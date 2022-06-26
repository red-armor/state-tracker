import { produceImpl as ES5Produce } from '../src/es5';
import { produceImpl as ES6Produce } from '../src/proxy';
import { Reaction, StateTrackerUtil } from '../src';

testTracker(true);
testTracker(false);

function testTracker(useProxy: boolean) {
  const produce = useProxy ? ES6Produce : ES5Produce;

  const decorateDesc = (text: string) =>
    useProxy ? `proxy: ${text}` : `es5: ${text}`;

  describe(decorateDesc('Reaction'), () => {
    it('shallow equal and default state compare level is 0', () => {
      const state = { a: { a1: 1, a2: 2 } };
      const proxyState = produce(state);

      let a1 = 0;
      let count = 0;

      new Reaction({
        fn: state => {
          a1 = state.a.a1;
          count++;
        },
        state: proxyState,
      });
      expect(count).toBe(1);
      expect(a1).toBe(1);

      StateTrackerUtil.setValue(proxyState, {
        a: proxyState.a,
      });

      expect(count).toBe(1);
      expect(a1).toBe(1);
    });
    it('shallow equal', () => {
      const state = { a: { a1: 1, a2: 2 } };
      const proxyState = produce(state);

      let a1 = 0;
      let count = 0;

      new Reaction({
        fn: state => {
          a1 = state.a.a1;
          count++;
        },
        state: proxyState,
      });
      expect(count).toBe(1);
      expect(a1).toBe(1);

      StateTrackerUtil.setValue(proxyState, {
        a: { a1: 1, a2: 2 },
      });

      expect(count).toBe(2);
      expect(a1).toBe(1);
    });
    it('deep equal', () => {
      const state = { a: { a1: 1, a2: 2 } };
      const proxyState = produce(state);

      let a1 = 0;
      let count = 0;

      new Reaction({
        fn: state => {
          a1 = state.a.a1;
          count++;
        },
        shallowEqual: false,
        state: proxyState,
      });
      expect(count).toBe(1);
      expect(a1).toBe(1);

      StateTrackerUtil.setValue(proxyState, {
        a: { a1: 1, a2: 2 },
      });

      expect(count).toBe(1);
      expect(a1).toBe(1);
    });
  });
}
