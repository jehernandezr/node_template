import { Output } from '../../output.js';

/** Output that stores the lines so tests can check them. */
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
