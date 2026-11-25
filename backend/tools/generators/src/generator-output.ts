/** Where the generators write what they tell whoever runs them. */
export abstract class GeneratorOutput {
  abstract info(message: string): void;
  abstract error(message: string): void;
}
