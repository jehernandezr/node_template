/** Respuesta de `HttpTestClient`. `body` es el JSON ya leído, o `undefined` si no había cuerpo. */
export interface HttpTestResponse {
  readonly status: number;
  readonly headers: Headers;
  readonly body: unknown;
  readonly text: string;
}
