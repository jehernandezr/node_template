/** Response of a function behind an API Gateway HTTP API with payload format 2.0. */
export interface ApiGatewayHttpResponse {
  readonly statusCode: number;
  /** Headers without `set-cookie`: those go in `cookies`. */
  readonly headers: Readonly<Record<string, string>>;
  /** One `set-cookie` entry per element. */
  readonly cookies: readonly string[];
  readonly body: string;
  readonly isBase64Encoded: boolean;
}
