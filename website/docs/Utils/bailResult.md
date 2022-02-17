---
title: bailResult(state, fns, predicate)
sidebar_position: 3
---

Sync run functions in `fns`, then return the first value matched predicate function. It allows exiting early.

---
```jsx
function bailResult (
  state: IStateTracker,
  fns: Array<Function>,
  predicate?: (v: any) => boolean
) => any
```

:::tip Attention

It should be used in reaction function.

:::

## Arguments
- `state`: produced Object
- `fns`: Basically, it should be a sync function with return value
- `predicate`: Default value is `v => typeof v !== 'undefined'`; fns will run in sync, until a function has a return value and match predicate function rule.
---

## Returns
It will return `undefined`, if there is no return value match predicate function;

## Example

```ts
import { bailResult } from 'state-tracker'

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

const getState = () => proxyState;

new Reaction({
  fn: ({ getState }: { getState: Function }) => {
    const state = getState();
    const result = bailResult(state, [
      () => state.content.name,
      () => state.content.title,
    ]);

    value = result;
    count++;
  },
  state: proxyState,
  scheduler: (fn: Function) => {
    fn({ getState });
  },
});

expect(count).toBe(1);
expect(value).toBe(undefined);

let content = { name: 'name' };

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
expect(value).toBe('name');
```

