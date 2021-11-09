import { ReactionProps } from './types';

class Reaction {
  private fn: Function;

  constructor(props: ReactionProps) {
    const { fn } = props;
    this.fn = fn;
  }

  run(...args: Array<any>) {
    console.log('args ', args)
    return this.fn.apply(null, args);
  }
}

export default Reaction;
