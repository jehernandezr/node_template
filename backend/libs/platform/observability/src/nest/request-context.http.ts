/** The minimum the middleware reads from an HTTP request, without depending on Express or Fastify. */
export interface RequestContextHttpRequest {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

/** The minimum the middleware writes to the response. */
export interface RequestContextHttpResponse {
  setHeader(name: string, value: string): unknown;
}
