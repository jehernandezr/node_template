/**
 * Lo mínimo que la librería lee de una petición. Es un tipo propio para no depender de los
 * tipos de Express: el adaptador HTTP real los cumple de forma estructural.
 */
export interface HttpRequestView {
  readonly method: string;
  /** Ruta sin query. */
  readonly path: string;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly ip?: string;
  readonly query: Readonly<Record<string, unknown>>;
  readonly params: Readonly<Record<string, string>>;
  readonly body?: unknown;
}
