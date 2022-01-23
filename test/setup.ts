// https://stackoverflow.com/questions/44467657/jest-better-way-to-disable-console-inside-unit-tests

// @ts-ignore
global.console = {
  log: jest.fn().mockImplementation(() => {}), // console.log are ignored in tests

  // Keep native behaviour for other methods, use those to print out things in your own tests, not `console.log`
  error: jest.fn().mockImplementation(() => {}), // console.error are ignored in tests
  warn: jest.fn().mockImplementation(() => {}), // console.warn are ignored in tests
  info: jest.fn().mockImplementation(() => {}), // console.info are ignored in tests
  debug: jest.fn().mockImplementation(() => {}), // console.debug are ignored in tests
};
