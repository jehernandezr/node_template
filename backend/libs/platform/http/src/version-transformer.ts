/**
 * Transforma la entrada y la salida de una ruta entre una versión anterior de la API y la actual. Mientras exista una
 * sola versión no hay transformadores: la clase queda lista para la primera que cambie un contrato.
 */
export abstract class VersionTransformer {
  /** Versión anterior que este transformador sabe traducir. */
  abstract readonly fromVersion: string;

  abstract transformRequest(routeId: string, input: unknown): unknown;

  abstract transformResponse(routeId: string, output: unknown): unknown;
}
