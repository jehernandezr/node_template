/** Why a generator cannot continue; shown to whoever runs it. */
export enum GeneratorErrorReason {
  InvalidName = 'invalid-name',
  AlreadyExists = 'already-exists',
  MissingService = 'missing-service',
  MissingMarker = 'missing-marker',
  InvalidArguments = 'invalid-arguments',
}

/** A generator that writes nothing because its input or the repository does not allow it. */
export class GeneratorError extends Error {
  constructor(
    readonly reason: GeneratorErrorReason,
    message: string,
  ) {
    super(message);
    this.name = 'GeneratorError';
  }
}
