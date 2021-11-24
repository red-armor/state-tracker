// https://www.mobxjs.com/refguide/when.html
// > when observes & runs the given predicate until it returns true.
// > Once that happens, the given effect is executed and the
// > autoRunner is disposed. The function returns a disposer to
// > cancel the autoRunner prematurely.

import { IStateTracker } from './types';
import Reaction from './Reaction';

function when(
  state: IStateTracker,
  predicate: (state: IStateTracker) => boolean,
  effect?: () => void
) {
  function when_reaction(this: Reaction) {
    const falsy = predicate(state);
    if (falsy) {
      this.dispose();
      if (typeof effect === 'function') effect();
    }
  }

  const reaction = new Reaction({
    state,
    fn: when_reaction,
  });

  return reaction.dispose;
}

export default when;
