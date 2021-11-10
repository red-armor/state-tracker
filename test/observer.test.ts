import produce from '../src/produce';
import observer from '../src/observer';

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

    it.only('basic', () => {
      const state = {
        app: {
          list: [{ id: 1, label: 'first' }],
          location: {
            city: 'shanghai',
          },
          title: 'testing',
          description: 'testing',
        },
      };

      const proxyState = produce(state);

      const fn = observer(proxyState, () => {
        const { app } = proxyState;
        return app.list.forEach((item: any) => {
          const {
            location: { city },
            title,
            description,
          } = proxyState.app;
          console.log('trigger ======');
          expect(city).toBe('shanghai');
          expect(title).toBe('testing');
          expect(description).toBe('testing');
          const func = observer(proxyState, (props: any) => {
            const { item } = props;
            return item.id;
          });
          func({ item });
        });
      });

      fn();
    });
  });
}
