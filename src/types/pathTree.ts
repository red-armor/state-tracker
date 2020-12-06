import Runner from '../Runner';

export enum UPDATE_TYPE {
  ARRAY_LENGTH_CHANGE = 'array_length_change',
  BASIC_VALUE_CHANGE = 'basic_value_change',
}

export type PendingRunners = {
  runner: Runner;
  updateType: UPDATE_TYPE;
};
