import { NextState } from './types';
import Reaction from './Reaction';
// 用来注册创建的Reaction；

class Container {
  private reactions: Array<Reaction>;
  private _state: NextState;
  private _stateToReactionsMap: Map<string, Set<Reaction>> = new Map();

  constructor({ state }: { state: NextState }) {
    this.reactions = [];
    this._state = state;
  }

  register(reaction: Reaction) {
    this.reactions.push(reaction);
    return () => {
      const index = this.reactions.findIndex(listener => listener === reaction);
      if (index !== -1) this.reactions.splice(index, 1);
    };
  }

  registerFineGrainListener(key: string, reaction: Reaction) {
    const set = this._stateToReactionsMap.has(key)
      ? this._stateToReactionsMap.get(key)
      : this._stateToReactionsMap.set(key, new Set()).get(key);
    set!.add(reaction);

    return () => set!.delete(reaction);
  }

  getReactions(key: string): Array<Reaction> {
    return this._stateToReactionsMap.has(key)
      ? Array.from(this._stateToReactionsMap.get(key) as any)
      : [];
  }

  perform(
    nextState: NextState,
    options?: {
      afterCallback?: Function;
      stateCompareLevel?: number;
    }
  ) {
    const nextKeys = Object.keys(nextState);
    const { afterCallback, stateCompareLevel } = options || {};

    // Only key related reactions will be selected, and reaction only
    // run onces.
    let reactions = new Set<Reaction>();
    nextKeys.forEach(key => {
      const currentValue = this._state[key];
      const nextValue = nextState[key];

      if (currentValue !== nextValue) {
        const currentReactions = this.getReactions(key);
        currentReactions.forEach(reaction => reactions.add(reaction));
      }
    });

    const tokens = Array.from(reactions).map(reaction => {
      return reaction.performComparison(nextState, {
        stateCompareLevel,
      });
    });

    if (typeof afterCallback === 'function') {
      afterCallback.call(null);
    }

    const seen: {
      [key: string]: boolean;
    } = {};

    tokens
      .filter(({ isEqual }) => !isEqual)
      .forEach(token => {
        const id = token.reaction._id;
        if (!seen[id]) {
          token.reaction.schedulerRun();
          seen[id] = true;
        }
      });

    this._state = nextState;
  }
}

export default Container;
