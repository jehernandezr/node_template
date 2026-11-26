import { GeneratorOutput } from '../../generator-output.js';

export class RecordingOutput extends GeneratorOutput {
  readonly infos: string[] = [];
  readonly errors: string[] = [];

  override info(message: string): void {
    this.infos.push(message);
  }

  override error(message: string): void {
    this.errors.push(message);
  }
}
