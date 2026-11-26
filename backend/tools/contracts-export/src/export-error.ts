/** Failure building or writing the artifacts generated from the contracts. */
export class ExportError extends Error {
  constructor(origin: string, reason: string) {
    super(`${origin}: ${reason}`);
    this.name = 'ExportError';
  }

  /**
   * Failure attributable to a service's contract.
   * @param service Service of the contract.
   * @param reason What failed.
   * @returns The error.
   */
  static forService(service: string, reason: string): ExportError {
    return new ExportError(`contracts-export (${service})`, reason);
  }

  /**
   * Failure building the messaging topology.
   * @param reason What failed.
   * @returns The error.
   */
  static forTopology(reason: string): ExportError {
    return new ExportError('topology-export', reason);
  }

  /**
   * Failure documenting messaging in AsyncAPI.
   * @param service Service whose messaging failed.
   * @param reason What failed.
   * @returns The error.
   */
  static forAsyncApi(service: string, reason: string): ExportError {
    return new ExportError(`asyncapi (${service})`, reason);
  }
}
