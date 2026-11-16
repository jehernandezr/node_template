/** Lo mínimo que el middleware lee de una petición HTTP, sin depender de Express ni Fastify. */
export interface RequestContextHttpRequest {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

/** Lo mínimo que el middleware escribe en la respuesta. */
export interface RequestContextHttpResponse {
  setHeader(name: string, value: string): unknown;
}
