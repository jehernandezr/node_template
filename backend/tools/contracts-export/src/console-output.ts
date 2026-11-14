import { Output } from './output.js';

export class ConsoleOutput extends Output {
  info(line: string): void {
    console.log(line);
  }

  error(line: string): void {
    console.error(line);
  }
}
