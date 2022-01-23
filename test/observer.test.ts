import { produceImpl as ES5Produce } from '../src/es5';
import { produceImpl as ES6Produce } from '../src/proxy';
import observer from '../src/observer';
import { StateTrackerUtil } from '../src';

testTracker(true);
testTracker(false);

function testTracker(useProxy: boolean) {
  const produce = useProxy ? ES6Produce : ES5Produce;

  const decorateDesc = (text: string) =>
    useProxy ? `proxy: ${text}` : `es5: ${text}`;

  describe(decorateDesc('observer'), () => {
    it('basic', () => {
      const state = {
        app: {
          list: [{ id: 1, label: 'first' }],
        },
      };

      const proxyState = produce(state);

      const fn = observer(proxyState, (props: any) => {
        const { app } = props;
        return app.list.forEach((item: any) => {
          const func = observer(proxyState, (props: any) => {
            const { item } = props;
            return item.id;
          });
          func({ item });
        });
      });

      fn({ app: proxyState.app });
    });

    it(
      'observer: \n' +
        '        1. props is shallow compare on default\n' +
        '        2. fn will be trigger even literal value of accessed path is not changed',
      () => {
        const state = {
          app: {
            list: [
              { id: 1, label: 'first' },
              { id: 2, label: 'second' },
            ],
          },
        };

        const funcCache = new Map();
        const proxyState = produce(state);
        let runCount = 0;

        const fn = observer(proxyState, (props: any) => {
          const { app } = props;
          return app.list.forEach((item: any) => {
            const func = funcCache.has(item.id)
              ? funcCache.get(item.id)
              : funcCache
                  .set(
                    item.id,
                    observer(proxyState, (props: any) => {
                      const { item } = props;
                      const { id } = item;
                      runCount++;
                      return `${id}`;
                    })
                  )
                  .get(item.id);
            func({ item });
          });
        });

        fn({ app: proxyState.app });
        expect(runCount).toBe(2);

        const app = state.app;
        const nextList = app.list.slice();
        nextList[0] = { ...nextList[0] };
        proxyState.app = { ...app, list: nextList };

        fn({ app: proxyState.app });

        expect(runCount).toBe(3);
      }
    );

    it('observer: state', done => {
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
      const app = proxyState.app;

      const fn = observer(proxyState, () => {
        const { list } = proxyState.app;
        return list.forEach((item: any) => {
          const {
            location: { city },
            description,
          } = app;
          try {
            expect(city).toBe('shanghai');
            expect(description).toBe('testing');
          } catch (err) {
            done(err);
          }
          const func = observer(proxyState, (props: any) => {
            const { item } = props;
            return item.id;
          });
          func({ item });
        });
      });

      fn({ app: proxyState.app });

      const nextApp = state.app;
      const nextList = nextApp.list.slice();
      nextList[0] = { ...nextList[0], label: 'first_1' };
      proxyState.app = { ...nextApp, list: nextList };
      nextApp.title = 'next';

      fn({ app: proxyState.app });
      done();
    });

    it('observer: state perform', () => {
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
      const app = proxyState.app;

      const fn = observer(proxyState, () => {
        const { list } = proxyState.app;
        const {
          location: { city },
          description,
          // @ts-ignore
          title,  // eslint-disable-line
        } = app;
        expect(city).toBe('shanghai');
        expect(description).toBe('testing');

        return list.forEach((item: any) => {
          const func = observer(proxyState, (props: any) => {
            const { item } = props;
            return item.id;
          });
          func({ item });
        });
      });

      fn();

      const nextApp = state.app;
      nextApp.title = 'next';
      const nextList = nextApp.list.slice();
      nextList[0] = { ...nextList[0], label: 'first_1' };

      StateTrackerUtil.perform(
        proxyState,
        {
          app: { ...nextApp, list: nextList },
        },
        {
          stateCompareLevel: 1,
        }
      );
    });
  });
}
