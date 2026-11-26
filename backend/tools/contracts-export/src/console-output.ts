import { Output } from './output.js';

/** Writes the export messages to the process console. */
export class ConsoleOutput extends Output {
  override info(line: string): void {
    console.log(line);
  }

  override error(line: string): void {
    console.error(line);
  }
}
