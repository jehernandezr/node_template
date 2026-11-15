/** Ruta HTTP de las operaciones internas. */
export class InternalApiRoute {
  /** Prefijo del controller, sin barra inicial. */
  static readonly BASE = 'internal/operations';

  /** Ruta completa, con barra inicial, de una operación. Es lo que se firma. */
  static pathOf(operationId: string): string {
    return `/${InternalApiRoute.BASE}/${encodeURIComponent(operationId)}`;
  }
}
