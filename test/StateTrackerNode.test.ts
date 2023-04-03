import { Reaction } from '../src';
import StateTrackerNode from '../src/StateTrackerNode';
import { produce } from '../src/index';
import Graph from '../src/Graph';

describe('StateTrackerNode', () => {
  test('should initialize StateTrackerNode with the correct properties', () => {
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
    const reaction = new Reaction(
      {
        fn: (state: any) => {
          title = state.app.title;
        },
        state: proxyState,
      },
      {
        data: proxyData,
      }
    );
    let resChangedValueListener: any;
    const TStateTrackerNode = new StateTrackerNode({
      reaction,
      name: 'trackerNode',
      shallowEqual: true,
      props: { data: { list: { select: 3 } } },
      activityListener: () => {},
      changedValueListener: payload => {
        resChangedValueListener = payload;
      },
    });
    expect(title).toBe('current');
    expect(TStateTrackerNode.getProps()).toEqual({
      data: { list: { select: 3 } },
    });
    expect(TStateTrackerNode.getReaction()).toEqual(reaction);
    expect(TStateTrackerNode.getShallowEqual()).toBe(true);
    expect(TStateTrackerNode.generateAffectedPathKey(['app', 'list'])).toBe(
      'app_list'
    );
    expect(TStateTrackerNode.generateAffectedPathKey()).toBe('');
    const ScreenshotToken = {
      diffKey: 'title',
      currentValue: 'current',
      nextValue: 'next',
      action: '',
      graph: new Map().set('app', new Graph('app')),
    };
    TStateTrackerNode._logChangedValue(ScreenshotToken);
    expect(resChangedValueListener).toEqual(ScreenshotToken);
    TStateTrackerNode.setObserverProps();
    expect(TStateTrackerNode.getProps()).toEqual({});
  });

  test('should StateTrackerNode hydrateFalsyScreenshot get correct ChangedValueListener', () => {
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
    const reaction = new Reaction(
      {
        fn: (state: any) => {
          title = state.app.title;
        },
        state: proxyState,
      },
      {
        data: proxyData,
      }
    );
    let resChangedValueListener: any;
    const TStateTrackerNode = new StateTrackerNode({
      reaction,
      name: 'trackerNode',
      shallowEqual: true,
      props: { data: { list: { select: 3 } } },
      activityListener: () => {},
      changedValueListener: payload => {
        resChangedValueListener = payload;
      },
    });
    expect(title).toBe('current');
    const ScreenshotToken = {
      diffKey: 'title',
      currentValue: 'current',
      nextValue: 'next',
      action: '',
      graph: new Map().set('app', new Graph('app')),
    };
    TStateTrackerNode._logChangedValue(ScreenshotToken);
    expect(resChangedValueListener).toEqual(ScreenshotToken);
    TStateTrackerNode.setObserverProps();
    expect(TStateTrackerNode.getProps()).toEqual({});

    //test hydrateFalsyScreenshot
    const token = {
      currentValue: false,
      isEqual: false,
      key: 'selected',
      nextValue: 0,
    };
    const resProps = {
      action: 'isPropsEqual',
      currentValue: false,
      diffKey: 'selected',
      nextValue: 0,
      reaction,
      graph: new Map(),
    };
    TStateTrackerNode.hydrateFalsyScreenshot(undefined, token, 'props');
    expect(resChangedValueListener).toEqual(resProps);
    const newToken = {
      currentValue: false,
      isEqual: false,
      key: 'selected',
      nextValue: false,
    };
    const resState = {
      action: 'isStateEqual',
      currentValue: false,
      diffKey: 'selected',
      nextValue: false,
      reaction,
      graph: new Map(),
    };

    // isEqual = true
    newToken.isEqual = true;
    TStateTrackerNode.hydrateFalsyScreenshot({}, newToken, 'state');
    expect(resChangedValueListener).toEqual(resProps);

    // isEqual = false
    newToken.isEqual = false;
    TStateTrackerNode.hydrateFalsyScreenshot({}, newToken, 'state');
    expect(resChangedValueListener).toEqual(resState);
  });

  test('should track', () => {
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
    const reaction = new Reaction(
      {
        fn: (state: any) => {
          title = state.app.title;
        },
        state: proxyState,
      },
      {
        data: proxyData,
      }
    );
    // let resChangedValueListener: any;
    const TStateTrackerNode = new StateTrackerNode({
      reaction,
      name: 'trackerNode',
      shallowEqual: true,
      props: proxyState,
      activityListener: () => {},
      changedValueListener: payload => {
        // resChangedValueListener = payload;
        console.log(payload);
      },
    });
    expect(title).toBe('current');
    const trackParams = {
      target: proxyState['app'],
      key: '0',
      value: proxyState.app.list['0'],
      path: ['app', 'list', '0'],
    };
    TStateTrackerNode.track(trackParams);
    expect(TStateTrackerNode.getProps()).toEqual(proxyState);
  });

  test('should isPropsShallowEqual is be test', () => {
    const state: any = {
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
    const reaction = new Reaction(
      {
        fn: (state: any) => {
          title = state.app.title;
        },
        state: proxyState,
      },
      {
        data: proxyData,
      }
    );
    // let resChangedValueListener: any;
    const TStateTrackerNode = new StateTrackerNode({
      reaction,
      name: 'trackerNode',
      shallowEqual: true,
      props: proxyState,
      activityListener: () => {},
      changedValueListener: undefined,
    });
    expect(title).toBe('current');
    expect(
      TStateTrackerNode.isPropsShallowEqual({ app: {}, data: {} })
    ).toEqual({ currentValue: null, isEqual: false, key: '', nextValue: null });
  });
});
