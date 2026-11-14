import { ConsoleOutput } from '../console-output.js';

describe('ConsoleOutput', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('info', () => {
    it('writes the line to console.log', () => {
      const log = jest
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);
      const output = new ConsoleOutput();

      output.info('x');

      expect(log).toHaveBeenCalledWith('x');
    });
  });

  describe('error', () => {
    it('writes the line to console.error', () => {
      const error = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const output = new ConsoleOutput();

      output.error('y');

      expect(error).toHaveBeenCalledWith('y');
    });
  });
});
