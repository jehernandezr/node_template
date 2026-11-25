/** Text output of the tool, so it can be tested without the console. */
export abstract class Output {
  abstract info(line: string): void;
  abstract error(line: string): void;
}
