import { produceImpl as ES5Produce } from '../src/es5';
import { produceImpl as ES6Produce } from '../src/proxy';
import { Reaction } from '../src';

testTracker(true);
testTracker(false);

function testTracker(useProxy: boolean) {
  const produce = useProxy ? ES6Produce : ES5Produce;

  const decorateDesc = (text: string) =>
    useProxy ? `proxy: ${text}` : `es5: ${text}`;

  describe(decorateDesc('Reaction'), () => {
    it('reaction will run once after created', () => {
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

      new Reaction({
        fn: () => count++,
        state: proxyState,
      });
      expect(count).toBe(1);
    });
    it('reaction with scheduler', () => {
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
      let title = '';

      new Reaction({
        fn: (state: any) => {
          title = state.app.title;
          count++;
        },
        state: proxyState,
        // scheduler: (fn: Function) => {
        //   fn({ getState });
        // },
      });
      expect(count).toBe(1);
      expect(title).toBe('current');
    });
  });
}
