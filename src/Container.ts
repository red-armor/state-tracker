import { NextState } from './types';
import Reaction from './Reaction';
// 用来注册创建的Reaction；

class Container {
  private reactions: Array<Reaction>;

  constructor() {
    this.reactions = [];
  }

  register(reaction: Reaction) {
    this.reactions.push(reaction);
    return () => {
      const index = this.reactions.findIndex(listener => listener === reaction);
      if (index !== -1) this.reactions.splice(index, 1);
    };
  }

  perform(nextState: NextState, afterCallback?: Function) {
    const tokens = this.reactions.map(reaction => {
      return reaction.performComparison(nextState);
    });

    if (typeof afterCallback === 'function') {
      afterCallback.call(null);
    }

    tokens
      .filter(({ isEqual }) => !isEqual)
      .forEach(({ reaction }) => reaction.schedulerRun());
  }
}

export default Container;
