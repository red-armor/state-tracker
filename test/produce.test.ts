import produce from '../src/index.experimental';

describe('blah', () => {
  it('works', () => {
    const state = {
      a: {
        a1: 1,
        a2: 2,
      },
      b: {
        b1: 1,
        b2: 2,
      },
    };
    const proxyState = produce(state);
    proxyState.enter();
    console.log('proxy state ', proxyState.a);
    console.log('proxy state ', proxyState.a.a1);
    console.log('proxy state ', proxyState.a.a2);
    proxyState.leave();

    console.log('proxy state ', proxyState);
  });
});
