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
      const changedValue = { app: { title: 'next' } };
      const reaction = new Reaction({
        fn: () => count++,
        state: proxyState,
        changedValue,
      });
      expect(proxyState['unlink']()).toEqual(JSON.parse(JSON.stringify(state)));
      expect(reaction.getChangedValue()).toBe(changedValue);
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

      const reaction = new Reaction(
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

      reaction.enter();
      reaction.leave();
      reaction.teardown();
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

  it('buildAffectedPathsGraph should create a graph with the correct paths', () => {
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

    let title = '';
    let description = '';

    const reaction = new Reaction(
      {
        fn: (state: any) => {
          title = state.app.title;
          description = state.app.description;
        },
        name: 'testBuildAffectedPathsGraph',
        state: proxyState,
      },
      {
        data: proxyData,
      }
    );
    const paths = reaction.getAffectedPaths();
    const graphMap: any = reaction.buildAffectedPathsGraph(paths as any);
    const getPaths = graphMap.get('app');
    expect(reaction.name).toBe('testBuildAffectedPathsGraph');
    expect(title).toBe('current');
    expect(description).toBe('testing');
    expect(paths).toEqual({
      app: [['app'], ['app', 'title'], ['app', 'description']],
    });
    expect(graphMap.size).toBe(1);
    expect(getPaths.getPaths()).toEqual([
      ['app'],
      ['app', 'title'],
      ['app', 'description'],
    ]);
    expect(getPaths).not.toBeUndefined();
    expect(reaction.getStateTrackerNode().name).toEqual(
      'testBuildAffectedPathsGraph'
    );
    expect(reaction.getStateTrackerNode()._reaction).toEqual(reaction);
    expect(reaction.getStateTrackerNode()._shallowEqual).toEqual(
      reaction._shallowEqual
    );
    expect(reaction.getStateTrackerNode().changedValueListener).toEqual(
      undefined
    );
    expect(reaction.getStateTrackerNode().activityListener).toEqual(undefined);
  });
}
