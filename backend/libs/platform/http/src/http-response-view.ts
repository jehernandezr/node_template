/** Lo mínimo que la librería escribe en una respuesta; ver `HttpRequestView`. */
export interface HttpResponseView {
  setHeader(name: string, value: string | string[]): unknown;
  getHeader(name: string): unknown;
  /** Agrega un valor a un header que admite varios (`Set-Cookie`). */
  append(name: string, value: string): unknown;
  status(code: number): unknown;
}
