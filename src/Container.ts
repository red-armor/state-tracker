import { IStateTracker } from './types';
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

  perform(state: IStateTracker) {
    this.reactions.forEach(reaction => reaction.perform(state));
  }
}

export default Container;
