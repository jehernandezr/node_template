/**
 * The minimum the library reads from a request. It is its own type so as not to depend on the
 * Express types: the real HTTP adapter satisfies them structurally.
 */
export interface HttpRequestView {
  readonly method: string;
  /** Path without query. */
  readonly path: string;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly ip?: string;
  readonly query: Readonly<Record<string, unknown>>;
  readonly params: Readonly<Record<string, string>>;
  readonly body?: unknown;
}
