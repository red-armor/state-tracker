import produce from '../src/produce';
import observer from '../src/observer';

testTracker(true);

function testTracker(useProxy: boolean) {
  const decorateDesc = (text: string) =>
    useProxy ? `proxy: ${text}` : `es5: ${text}`;

  describe(decorateDesc('observer'), () => {
    it('observer', () => {
      const state = {
        app: {
          list: [
            { id: 1, label: 'first' },
            { id: 2, label: 'second' },
            { id: 3, label: 'third' },
            { id: 4, label: 'forth' },
          ],
        },
      };

      const proxyState = produce(state);

      const fn = observer(proxyState, () => {
        return proxyState.app.list.map((item: any) => {
          const func = observer(
            proxyState,
            () => {
              // const { item } = props;
              // console.log('item ', item.id);
            },
            { props: { item } }
          );

          func();
        });
      });

      fn();
    });
  });
}
