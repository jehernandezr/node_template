/**
 * Event of an API Gateway HTTP API with payload format 2.0 (the one
 * `api-routes` uses for the functions). Only the fields the adapter reads; it is
 * declared here to avoid depending on `@types/aws-lambda`.
 */
export interface ApiGatewayHttpEvent {
  readonly version: string;
  /** Path as it arrived, without the query and with the original escaping. */
  readonly rawPath: string;
  /** Query without the leading `?`; empty if there is none. */
  readonly rawQueryString: string;
  /** Headers with lowercase names; repeated values are joined with a comma. */
  readonly headers?: Readonly<Record<string, string | undefined>>;
  /** Request cookies, one per element (`name=value`). */
  readonly cookies?: readonly string[];
  readonly requestContext: {
    readonly requestId?: string;
    readonly http: {
      readonly method: string;
      readonly sourceIp?: string;
    };
  };
  readonly body?: string;
  readonly isBase64Encoded?: boolean;
}
