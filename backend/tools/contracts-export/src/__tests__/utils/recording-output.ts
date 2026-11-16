import { Output } from '../../output.js';

/** Salida que guarda las líneas para que las pruebas las comprueben. */
export class RecordingOutput extends Output {
  readonly infoLines: string[] = [];
  readonly errorLines: string[] = [];

  info(line: string): void {
    this.infoLines.push(line);
  }

  error(line: string): void {
    this.errorLines.push(line);
  }
}
