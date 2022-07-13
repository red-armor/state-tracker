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
    it('should compare derivedCache value', () => {
      const state = {
        app: {
          list: [{ id: 1, label: 'first' }],
          location: {
            city: 'shanghai',
          },
          title: 'current',
          description: 'testing',
        },
        bottom: {
          location: {},
        },
      };

      const proxyState = produce(state);
      let countA = 0;
      let countB = 0;
      let cityA = '';
      let cityB = '';

      new Reaction({
        fn: state => {
          const app = StateTrackerUtil.peek(state, ['app']);
          cityA = app.location.city;
          countA++;
        },
        state: proxyState,
      });
      new Reaction({
        fn: state => {
          const bottom = StateTrackerUtil.peek(state, ['bottom']);
          cityB = bottom.location.city;
          countB++;
        },
        state: proxyState,
      });

      expect(countA).toBe(1);
      expect(countB).toBe(1);
      expect(cityA).toBe('shanghai');
      expect(cityB).toBe(undefined);

      StateTrackerUtil.setValue(
        proxyState,
        {
          ...proxyState,
          bottom: {
            location: proxyState.app.location,
          },
        },
        {
          stateCompareLevel: 1,
        }
      );
      expect(countA).toBe(1);
      expect(countB).toBe(2);
      expect(cityA).toBe('shanghai');
      expect(cityB).toBe('shanghai');

      StateTrackerUtil.setValue(
        proxyState,
        {
          ...proxyState,
          bottom: {
            location: proxyState.app.location,
          },
        },
        {
          stateCompareLevel: 1,
        }
      );
      expect(countA).toBe(1);
      expect(countB).toBe(2);
      expect(cityA).toBe('shanghai');
      expect(cityB).toBe('shanghai');
    });
  });
}
