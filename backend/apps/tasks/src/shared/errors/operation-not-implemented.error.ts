/** Una operación del contrato todavía no tiene implementación. Se responde como `PLATFORM.INTERNAL.UNEXPECTED`. */
export class OperationNotImplementedError extends Error {
  constructor(readonly operationId: string) {
    super(`Operation ${operationId} is not implemented yet`);
    this.name = 'OperationNotImplementedError';
  }
}
