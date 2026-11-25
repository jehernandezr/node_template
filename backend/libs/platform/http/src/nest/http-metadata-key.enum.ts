/** Keys of the metadata written by `@Resource` and `@Endpoint`. */
export enum HttpMetadataKey {
  Resource = 'platform:http:resource',
  Endpoint = 'platform:http:endpoint',
}

/** Properties that the middlewares and the guard leave on the request object. */
export enum HttpRequestKey {
  /** `ClientInfo`, written by `OriginPolicyMiddleware`. */
  ClientInfo = 'platformHttpClientInfo',
  /** `EndpointCall`, written by `EndpointGuard`. */
  Call = 'platformHttpCall',
}
