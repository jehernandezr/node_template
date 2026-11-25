/** Options of an `HttpTestClient` request. */
export interface HttpTestRequest {
  readonly headers?: Readonly<Record<string, string>>;
  /** Object sent as JSON. */
  readonly body?: unknown;
  /** Text sent as is, to test broken JSON or a different content type. */
  readonly rawBody?: string;
}
