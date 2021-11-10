import { ReactionProps } from './types';

class Reaction {
  private fn: Function;

  constructor(props: ReactionProps) {
    const { fn } = props;
    this.fn = fn;
  }

  run(...args: Array<any>) {
    return this.fn.apply(null, args);
  }
}

export default Reaction;
