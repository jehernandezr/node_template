import { Output } from './output.js';

/** Writes the export messages to the process console, or to the console the caller passes. */
export class ConsoleOutput extends Output {
  /**
   * @param console Console that receives the lines: the global one by default.
   */
  constructor(
    private readonly console: Pick<
      Console,
      'log' | 'error'
    > = globalThis.console,
  ) {
    super();
  }

  override info(line: string): void {
    this.console.log(line);
  }

  override error(line: string): void {
    this.console.error(line);
  }
}
