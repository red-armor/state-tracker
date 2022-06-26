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

    it('reaction with props', () => {
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
      const data = [
        {
          title: 1,
        },
      ];
      const proxyState = produce(state);
      const proxyData = produce(data);

      let count = 0;
      let title = '';

      new Reaction(
        {
          fn: (state: any) => {
            title = state.app.title;
            count++;
          },
          state: proxyState,
        },
        {
          data: proxyData,
        }
      );
      expect(count).toBe(1);
      expect(title).toBe('current');
    });
  });

  it('reaction setValue of state will cause rerender', () => {
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
    const data = [
      {
        price: 3,
      },
    ];
    const proxyState = produce(state);
    const proxyData = produce(data);

    let count = 0;
    let title = '';
    let price = 0;

    new Reaction(
      {
        fn: (state: any, props: any) => {
          title = state.app.title;
          price = props.data[0].price;
          count++;
        },
        state: proxyState,
      },
      {
        data: proxyData,
      }
    );

    StateTrackerUtil.setValue(proxyState, {
      app: {
        list: [{ id: 1, label: 'first' }],
        location: {
          city: 'shanghai',
        },
        title: 'next',
        description: 'testing',
      },
    });

    expect(count).toBe(2);
    expect(title).toBe('next');
    expect(price).toBe(3);
  });

  it('only props change will not trigger rerender', () => {
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
    const data = [
      {
        price: 3,
      },
    ];
    const proxyState = produce(state);
    const proxyData = produce(data);

    let count = 0;
    let title = '';
    let price = 0;

    new Reaction(
      {
        fn: (state: any, props: any) => {
          title = state.app.title;
          price = props.data[0].price;
          count++;
        },
        state: proxyState,
      },
      {
        data: proxyData,
      }
    );

    StateTrackerUtil.setValue(proxyData, {
      data: [
        {
          price: 4,
        },
      ],
    });

    expect(count).toBe(1);
    expect(title).toBe('current');
    expect(price).toBe(3);
  });

  it('setValue and props change cause re-run', () => {
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
    const data = {
      data: [
        {
          price: 3,
        },
      ],
    };
    const proxyState = produce(state);
    const proxyData = produce(data);

    let count = 0;
    let title = '';
    let price = 0;

    new Reaction(
      {
        fn: (state: any, props: any) => {
          title = state.app.title;
          price = props.data[0].price;
          count++;
        },
        state: proxyState,
      },
      proxyData
    );

    StateTrackerUtil.setValue(proxyData, {
      data: [
        {
          price: 4,
        },
      ],
    });
    StateTrackerUtil.setValue(proxyState, {
      app: {
        list: [{ id: 1, label: 'first' }],
        location: {
          city: 'shanghai',
        },
        title: 'next',
        description: 'testing',
      },
    });

    expect(count).toBe(2);
    expect(title).toBe('next');
    expect(price).toBe(4);
  });
}
