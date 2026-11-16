/** Una ruta del contrato todavía no tiene su caso de uso. Se responde como `PLATFORM.INTERNAL.UNEXPECTED`. */
export class RouteNotImplementedError extends Error {
  constructor(readonly routeId: string) {
    super(`Route ${routeId} is not implemented yet`);
    this.name = 'RouteNotImplementedError';
  }
}
