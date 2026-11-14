/** Salida de texto de la herramienta, para poder probar sin la consola. */
export abstract class Output {
  abstract info(line: string): void;
  abstract error(line: string): void;
}
