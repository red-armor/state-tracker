class StateTrackerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateTrackerError';
  }

  // deserialize() {}
}

export default StateTrackerError;
