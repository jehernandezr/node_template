/** Text output of the tool, so it can be tested without the console. */
export abstract class Output {
  /**
   * Writes an informative line.
   * @param line Text to write.
   */
  abstract info(line: string): void;
  /**
   * Writes an error line.
   * @param line Text to write.
   */
  abstract error(line: string): void;
}
