/** `HttpTestClient` response. `body` is the already parsed JSON, or `undefined` if there was no body. */
export interface HttpTestResponse {
  readonly status: number;
  readonly headers: Headers;
  readonly body: unknown;
  readonly text: string;
}
