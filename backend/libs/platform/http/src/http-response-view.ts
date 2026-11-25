/** The minimum the library writes to a response; see `HttpRequestView`. */
export interface HttpResponseView {
  setHeader(name: string, value: string | string[]): unknown;
  getHeader(name: string): unknown;
  /** Appends a value to a header that allows several (`Set-Cookie`). */
  append(name: string, value: string): unknown;
  status(code: number): unknown;
}
