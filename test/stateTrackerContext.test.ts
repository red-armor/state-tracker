import Container from '../src/Container';
import StateTrackerContext from '../src/StateTrackerContext';

describe('StateTrackerContext', () => {
  const state = { a: 41 };
  const props = {
    container: new Container({ state }),
    proxyCache: new Map(),
  };
  let context: StateTrackerContext;

  beforeEach(() => {
    context = new StateTrackerContext(props);
  });

  test('should initialize with the correct properties', () => {
    expect(context.container).toBe(props.container);
    expect(typeof context.getId()).toBe('string');
    expect(context.getCachedProxy('path', 'key')).toBeUndefined();
    expect(
      context.setCachedProxy('path-other', { key: 'key' }, { a: 'value' })
    ).toBeUndefined();
    expect(context.getCurrent()).toBeUndefined();
    expect(typeof context.updateTime()).toBe('undefined');
    expect(typeof context.getTime()).toBe('number');
  });

  test('should correctly enter and leave tracker nodes', () => {
    context.enter('node1');
    expect(context.getCurrent()?.name).toBe('node1');

    context.enter('node2');
    expect(context.getCurrent()?.name).toBe('node2');

    context.leave();
    expect(context.getCurrent()?.name).toBe('node1');

    context.pop();
    expect(context.getCurrent()).toBeUndefined();
  });

  test('should correctly get and set cached proxies', () => {
    const obj = { a: 1 };
    expect(context.getCachedProxy('path1', obj)).toBeUndefined();

    context.setCachedProxy('path1', obj, 'proxy');
    expect(context.getCachedProxy('path1', obj)).toBe('proxy');
  });
});
