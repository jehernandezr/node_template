/** Failure building or writing the artifacts generated from the contracts. */
export class ExportError extends Error {
  constructor(origin: string, reason: string) {
    super(`${origin}: ${reason}`);
    this.name = 'ExportError';
  }

  /** Failure attributable to a service's contract. */
  static forService(service: string, reason: string): ExportError {
    return new ExportError(`contracts-export (${service})`, reason);
  }

  /** Failure building the messaging topology. */
  static forTopology(reason: string): ExportError {
    return new ExportError('topology-export', reason);
  }

  /** Failure documenting messaging in AsyncAPI. */
  static forAsyncApi(service: string, reason: string): ExportError {
    return new ExportError(`asyncapi (${service})`, reason);
  }
}
