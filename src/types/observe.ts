export type ObserverProps = {
  [key: string]: any;
};

export type ObserverOptions = {
  scheduler?: Function;
  shallowEqual?: boolean;
  // props?: ObserverProps;
};
