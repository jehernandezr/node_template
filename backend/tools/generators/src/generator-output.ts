/** Dónde escriben los generadores lo que le dicen a quien los corre. */
export abstract class GeneratorOutput {
  abstract info(message: string): void;
  abstract error(message: string): void;
}
