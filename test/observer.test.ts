import produce from '../src/produce';
import observer from '../src/observer';
import { StateTrackerUtil } from '../src';

testTracker(true);

function testTracker(useProxy: boolean) {
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

    it('observer: fn will not rerun if access path value not change', () => {
      const state = {
        app: {
          list: [{ id: 1, label: 'first' }],
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
      expect(runCount).toBe(1);

      const app = state.app;
      const nextList = app.list.slice();
      nextList[0] = { ...nextList[0], label: 'first_1' };
      proxyState.app = { ...app, list: nextList };

      fn({ app: proxyState.app });

      expect(runCount).toBe(1);
    });

    // teardown should be placed in `run` function, or it will throw error!!!
    it('observer: fn will rerun if access path value changed', () => {
      const state = {
        app: {
          list: [{ id: 1, label: 'first' }],
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
                    const { id, label } = item;
                    runCount++;
                    return `${id}_${label}`;
                  })
                )
                .get(item.id);
          func({ item });
        });
      });

      fn({ app: proxyState.app });
      expect(runCount).toBe(1);

      const app = state.app;
      const nextList = app.list.slice();
      nextList[0] = { ...nextList[0], label: 'first_1' };
      proxyState.app = { ...app, list: nextList };

      fn({ app: proxyState.app });

      expect(runCount).toBe(2);
    });

    it('observer: state', () => {
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
          expect(city).toBe('shanghai');
          expect(description).toBe('testing');
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
          enableRootComparison: false,
        }
      );
    });
  });
}
