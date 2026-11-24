/** Por qué un generador no puede seguir; se le muestra a quien lo corre. */
export enum GeneratorErrorReason {
  InvalidName = 'invalid-name',
  AlreadyExists = 'already-exists',
  MissingService = 'missing-service',
  MissingMarker = 'missing-marker',
  InvalidArguments = 'invalid-arguments',
}

/** Un generador que no escribe nada porque su entrada o el repositorio no lo permiten. */
export class GeneratorError extends Error {
  constructor(
    readonly reason: GeneratorErrorReason,
    message: string,
  ) {
    super(message);
    this.name = 'GeneratorError';
  }
}
