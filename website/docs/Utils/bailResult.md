---
title: bailResult(state, fns, predicate)
sidebar_position: 3
---

To make return value if it match predicate function. it allows exiting early.

---
```jsx
function bailResult (
  state: IStateTracker,
  fns: Array<Function>,
  predicate?: (v: any) => boolean
) => any
```
- `state`:
- `fns`:
- `predicate`:
---

## Example

```ts
import { bailResult } from 'state-tracker'
```

