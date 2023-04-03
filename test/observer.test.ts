import { produceImpl as ES5Produce } from '../src/es5';
import { produceImpl as ES6Produce } from '../src/proxy';
import { observer } from '../src/index';
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
          // @ts-ignore
          const func = observer(proxyState, (state: any, props: any) => {
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

        // @ts-ignore
        const fn = observer(proxyState, (state: any, props: any) => {
          const { app } = props;
          return app.list.forEach((item: any) => {
            const func = funcCache.has(item.id)
              ? funcCache.get(item.id)
              : funcCache
                  .set(
                    item.id,
                    // @ts-ignore
                    observer(proxyState, (state: any, props: any) => {
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

    it('deep equal: props parent with deep equal', () => {
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

      // @ts-ignore
      const fn = observer(
        proxyState,
        // @ts-ignore
        (state: any, props: any) => {
          const { app } = props;
          return app.list.forEach((item: any) => {
            const func = funcCache.has(item.id)
              ? funcCache.get(item.id)
              : funcCache
                  .set(
                    item.id,
                    // @ts-ignore
                    observer(proxyState, (state: any, props: any) => {
                      const { item } = props;
                      const { id } = item;
                      runCount++;
                      return `${id}`;
                    })
                  )
                  .get(item.id);
            func({ item });
          });
        },
        {
          shallowEqual: false,
        }
      );

      fn({ app: proxyState.app });
      expect(runCount).toBe(2);

      const app = state.app;
      const nextList = app.list.slice();
      nextList[0] = { ...nextList[0] };
      proxyState.app = { ...app, list: nextList };

      fn({ app: proxyState.app });

      expect(runCount).toBe(3);
    });

    it('deep equal: props child with deep equal', () => {
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

      // @ts-ignore
      const fn = observer(proxyState, (state: any, props: any) => {
        const { app } = props;
        return app.list.forEach((item: any) => {
          const func = funcCache.has(item.id)
            ? funcCache.get(item.id)
            : funcCache
                .set(
                  item.id,
                  // @ts-ignore
                  observer(
                    proxyState,
                    // @ts-ignore
                    (state: any, props: any) => {
                      const { item } = props;
                      const { id } = item;
                      runCount++;
                      return `${id}`;
                    },
                    {
                      shallowEqual: false,
                    }
                  )
                )
                .get(item.id);
          func({ item });
        });
      });
      expect(runCount).toBe(0);
      fn({ app: proxyState.app });
      expect(runCount).toBe(2);

      const app = state.app;
      const nextList = app.list.slice();
      nextList[0] = { ...nextList[0] };
      proxyState.app = { ...app, list: nextList };

      fn({ app: proxyState.app });

      expect(runCount).toBe(3);
    });

    it('deep equal - state included: shallowEqual', () => {
      const state = {
        app: {
          list: [
            { id: 1, label: 'first' },
            { id: 2, label: 'second' },
          ],
        },
      };

      const proxyState = produce(state);
      let runCount = 0;

      // @ts-ignore
      const fn = observer(
        proxyState,
        // @ts-ignore
        (state: any) => {
          const { app } = state;
          runCount++;
          app.list.forEach((item: any) => {
            const { id } = item;
            return `${id}`;
          });
        }
      );

      fn();
      expect(runCount).toBe(1);

      const app = state.app;
      const nextList = app.list.slice();
      nextList[0] = { ...nextList[0] };
      StateTrackerUtil.setValue(proxyState, {
        app: {
          list: nextList,
        },
      });

      expect(runCount).toBe(2);
    });

    it('deep equal - state included: simple copy', () => {
      const state = {
        app: {
          list: [
            { id: 1, label: 'first' },
            { id: 2, label: 'second' },
          ],
        },
      };

      const proxyState = produce(state);
      let runCount = 0;

      // @ts-ignore
      const fn = observer(
        proxyState,
        // @ts-ignore
        (state: any) => {
          const { app } = state;
          runCount++;
          app.list.forEach((item: any) => {
            const { id } = item;
            return `${id}`;
          });
        },
        {
          shallowEqual: false,
        }
      );

      fn();
      expect(runCount).toBe(1);

      const app = state.app;
      const nextList = app.list.slice();
      nextList[0] = { ...nextList[0] };
      StateTrackerUtil.setValue(proxyState, {
        app: {
          list: nextList,
        },
      });

      expect(runCount).toBe(1);

      const appV2 = state.app;
      const nextListV2 = appV2.list.slice();
      nextListV2[0] = { ...nextListV2[0], label: 'third' };
      StateTrackerUtil.setValue(proxyState, {
        app: {
          list: nextListV2,
        },
      });

      expect(runCount).toBe(1);

      const appV3 = state.app;
      const nextListV3 = appV3.list.slice();
      nextListV3[0] = { ...nextListV3[0], id: 3 };
      StateTrackerUtil.setValue(proxyState, {
        app: {
          list: nextListV3,
        },
      });

      expect(runCount).toBe(2);
    });

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

          // @ts-ignore
          const func = observer(proxyState, (state: any, props: any) => {
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
