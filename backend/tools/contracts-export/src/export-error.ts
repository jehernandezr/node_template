/** Fallo al construir o escribir los artefactos generados desde los contratos. */
export class ExportError extends Error {
  constructor(origin: string, reason: string) {
    super(`${origin}: ${reason}`);
    this.name = 'ExportError';
  }

  /** Fallo atribuible al contrato de un servicio. */
  static forService(service: string, reason: string): ExportError {
    return new ExportError(`contracts-export (${service})`, reason);
  }

  /** Fallo al construir la topología de mensajería. */
  static forTopology(reason: string): ExportError {
    return new ExportError('topology-export', reason);
  }

  /** Fallo al documentar la mensajería en AsyncAPI. */
  static forAsyncApi(service: string, reason: string): ExportError {
    return new ExportError(`asyncapi (${service})`, reason);
  }
}
