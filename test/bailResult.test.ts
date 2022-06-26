import { produceImpl as ES5Produce } from '../src/es5';
import { produceImpl as ES6Produce } from '../src/proxy';
import { Reaction, bailResult, StateTrackerUtil } from '../src';

testTracker(true);
testTracker(false);

function testTracker(useProxy: boolean) {
  const produce = useProxy ? ES6Produce : ES5Produce;

  const decorateDesc = (text: string) =>
    useProxy ? `proxy: ${text}` : `es5: ${text}`;

  describe(decorateDesc('bailResult'), () => {
    it('return false', () => {
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
      let value;

      // const getState = () => proxyState;

      new Reaction({
        fn: (state: any) => {
          const result = bailResult(state, [() => !!state.app.name]);
          value = result;
          count++;
        },
        state: proxyState,
        // scheduler: (fn: Function) => {
        //   fn({ getState });
        // },
      });

      expect(count).toBe(1);
      expect(value).toBe(false);
    });
    it('return true', () => {
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
      let value;

      new Reaction({
        fn: (state: any) => {
          const result = bailResult(state, [() => !!state.app.title]);
          value = result;
          count++;
        },
        state: proxyState,
        // scheduler: (fn: Function) => {
        //   fn({ getState });
        // },
      });

      expect(count).toBe(1);
      expect(value).toBe(true);
    });
    it('return true with predicate function', () => {
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
      let value;

      // const getState = () => proxyState;

      new Reaction({
        fn: (state: any) => {
          const result = bailResult(
            state,
            [() => !!state.app.name, () => !!state.app.title],
            result => !!result
          );
          value = result;
          count++;
        },
        state: proxyState,
        // scheduler: (fn: Function) => {
        //   fn({ getState });
        // },
      });

      expect(count).toBe(1);
      expect(value).toBe(true);
    });
    it('basic return predicate value', () => {
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
      let value;

      // const getState = () => proxyState;

      new Reaction({
        fn: (state: any) => {
          const result = bailResult(
            state,
            [() => !!state.content.name, () => !!state.app.title],
            result => !!result
          );
          value = result;
          count++;
        },
        state: proxyState,
        // scheduler: (fn: Function) => {
        //   fn({ getState });
        // },
      });

      expect(count).toBe(1);
      expect(value).toBe(true);
    });
    it('has Error & return predicate resolved value', () => {
      const state = {
        app: {
          list: [{ id: 1, label: 'first' }],
          location: {
            city: 'shanghai',
          },
          title: 'current',
          description: 'testing',
        },
        content: undefined,
      };
      const proxyState = produce(state);
      let count = 0;
      let value;

      new Reaction({
        fn: (state: any) => {
          const result = bailResult(
            state,
            [() => !!state.content.name, () => !!state.content.title],
            result => !!result
          );

          value = result;
          count++;
        },
        state: proxyState,
        // scheduler: (fn: Function) => {
        //   fn({ getState });
        // },
      });

      expect(count).toBe(1);
      expect(value).toBe(undefined);

      const content = {
        name: 'name',
      };
      StateTrackerUtil.perform(
        proxyState,
        {
          ...proxyState,
          content,
        },
        {
          afterCallback: () => {
            proxyState.content = content;
          },
        }
      );

      expect(count).toBe(2);
      expect(value).toBe(true);
    });
    it('return second valid value', () => {
      const state = {
        app: {
          list: [{ id: 1, label: 'first' }],
          location: {
            city: 'shanghai',
          },
          title: 'current',
          description: 'testing',
        },
        content: undefined,
      };
      const proxyState = produce(state);
      let count = 0;
      let value;

      new Reaction({
        fn: (state: any) => {
          const result = bailResult(state, [
            () => state.content.name,
            () => state.content.title,
          ]);

          value = result;
          count++;
        },
        state: proxyState,
      });

      expect(count).toBe(1);
      expect(value).toBe(undefined);

      let content = { name: 'name' };

      StateTrackerUtil.setValue(proxyState, {
        ...proxyState,
        content,
      });

      expect(count).toBe(2);
      expect(value).toBe('name');

      // @ts-ignore
      content = { title: 'title' };
      StateTrackerUtil.setValue(proxyState, {
        ...proxyState,
        content,
      });
      expect(count).toBe(3);
      expect(value).toBe('title');

      // @ts-ignore
      // not rerun if not used key's value changed
      content = { title: 'title', location: 'shanghai' };
      StateTrackerUtil.setValue(proxyState, {
        ...proxyState,
        content,
      });
      expect(count).toBe(3);
      expect(value).toBe('title');

      // @ts-ignore
      // will rerun if used key's value changed
      content = { title: 'next', location: 'shanghai' };
      StateTrackerUtil.setValue(proxyState, {
        ...proxyState,
        content,
      });
      expect(count).toBe(4);
      expect(value).toBe('next');
    });
  });
}
