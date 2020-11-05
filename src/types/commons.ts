export enum Type {
  Object = 'object',
  Array = 'array',
}

export type IndexType = string | number;

export interface SeenKeys {
  [key: string]: boolean;
}
