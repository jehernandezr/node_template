/** Where the generators write what they tell whoever runs them. */
export abstract class GeneratorOutput {
  /**
   * Writes an informative message.
   * @param message Text to write.
   */
  abstract info(message: string): void;
  /**
   * Writes an error message.
   * @param message Text to write.
   */
  abstract error(message: string): void;
}
