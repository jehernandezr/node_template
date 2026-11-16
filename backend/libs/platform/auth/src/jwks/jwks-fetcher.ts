/** Descarga el documento JWKS del emisor. */
export abstract class JwksFetcher {
  /**
   * El cuerpo JSON de `{ keys: [...] }` sin validar.
   * @throws JwksUnavailableError si la red falla, la respuesta no es 200 o no es JSON.
   */
  abstract fetch(): Promise<unknown>;
}
