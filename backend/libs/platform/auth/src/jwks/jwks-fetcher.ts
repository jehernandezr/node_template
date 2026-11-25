/** Downloads the issuer JWKS document. */
export abstract class JwksFetcher {
  /**
   * Returns the unvalidated JSON body of `{ keys: [...] }`.
   * @throws JwksUnavailableError if the network fails, the response is not 200 or it is not JSON.
   */
  abstract fetch(): Promise<unknown>;
}
