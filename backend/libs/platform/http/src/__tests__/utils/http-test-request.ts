/** Opciones de una petición de `HttpTestClient`. */
export interface HttpTestRequest {
  readonly headers?: Readonly<Record<string, string>>;
  /** Objeto que se envía como JSON. */
  readonly body?: unknown;
  /** Texto que se envía tal cual, para probar JSON roto o un tipo de contenido distinto. */
  readonly rawBody?: string;
}
