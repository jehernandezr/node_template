/** What gets signed from a call: method, path, body and the protocol headers. */
export interface SignableRequest {
  /** Uppercase HTTP method. */
  readonly method: string;
  /** Path without query, like `InternalApiRoute.pathOf`. */
  readonly path: string;
  /** Already parsed body: the signature covers its canonical JSON, not the bytes sent. */
  readonly body: unknown;
  /**
   * Base URL of the target service (`ServiceBaseUrls`), without the path. Signers that bind the signature
   * to the target, such as SigV4, need it; HMAC ignores it.
   */
  readonly baseUrl?: string;
  /** Headers with lowercase names. */
  readonly headers: Readonly<Record<string, string | undefined>>;
}
