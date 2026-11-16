/** Escucha los errores que un canal reporta y los guarda. */
export class RecordingErrorListener {
  readonly errors: unknown[] = [];

  /** Lo que se pasa como `onError`. */
  readonly report = (error: unknown): void => {
    this.errors.push(error);
  };
}
