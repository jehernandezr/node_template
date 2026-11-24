import { GeneratorOutput } from './generator-output.js';

export class ConsoleOutput extends GeneratorOutput {
  info(message: string): void {
    console.log(message);
  }

  error(message: string): void {
    console.error(message);
  }
}
