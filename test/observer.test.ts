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

      const fn = observer(
        proxyState,
        (props: any) => {
          const { app } = props;
          return app.list.map((item: any) => {
            const func = observer(
              proxyState,
              (props: any) => {
                const { item } = props;
                console.log('item ', item.id);
              },
              { props: { item } }
            );
            func();
          });
        },
        {
          props: { app: proxyState.app },
        }
      );

      fn();
    });

    it.only('observer', () => {
      const state = {
        app: {
          list: [{ id: 1, label: 'first' }],
        },
      };

      const funcCache = new Map();
      const proxyState = produce(state);

      const fn = observer(
        proxyState,
        (props: any) => {
          const { app } = props;
          return app.list.map((item: any) => {
            const func = funcCache.has(item)
              ? funcCache.get(item)
              : funcCache
                  .set(
                    item,
                    observer(
                      proxyState,
                      (props: any) => {
                        const { item } = props;
                        console.log('item ', item.id);
                      },
                      { props: { item } }
                    )
                  )
                  .get(item);
            func();
          });
        },
        {
          props: { app: proxyState.app },
        }
      );

      fn();

      console.log('first part finished ======');

      const app = state.app;
      const nextList = app.list.slice();
      nextList[0] = { ...nextList[0], label: 'first_1' };
      proxyState.app = { ...app, list: nextList };

      fn();
    });
  });
}
