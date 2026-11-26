import { ConsoleOutput } from '../console-output.js';

/** Console that keeps each line it receives, by stream. */
class RecordingConsole {
  readonly logged: unknown[] = [];
  readonly errors: unknown[] = [];

  log(...data: unknown[]): void {
    this.logged.push(...data);
  }

  error(...data: unknown[]): void {
    this.errors.push(...data);
  }
}

describe('ConsoleOutput', () => {
  it('writes an informative line to the log stream only', () => {
    const console = new RecordingConsole();

    new ConsoleOutput(console).info('x');

    expect(console.logged).toEqual(['x']);
    expect(console.errors).toEqual([]);
  });

  it('writes an error line to the error stream only', () => {
    const console = new RecordingConsole();

    new ConsoleOutput(console).error('y');

    expect(console.errors).toEqual(['y']);
    expect(console.logged).toEqual([]);
  });
});
