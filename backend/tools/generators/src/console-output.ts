import { GeneratorOutput } from './generator-output.js';

export class ConsoleOutput extends GeneratorOutput {
  override info(message: string): void {
    console.log(message);
  }

  override error(message: string): void {
    console.error(message);
  }
}
