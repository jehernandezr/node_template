import { GeneratorOutput } from './generator-output.js';

/** Writes the generator messages to the process console. */
export class ConsoleOutput extends GeneratorOutput {
  override info(message: string): void {
    console.log(message);
  }

  override error(message: string): void {
    console.error(message);
  }
}
