/** Llaves de los metadatos que escriben `@Resource` y `@Endpoint`. */
export enum HttpMetadataKey {
  Resource = 'platform:http:resource',
  Endpoint = 'platform:http:endpoint',
}

/** Propiedades que los middlewares y el guard dejan en el objeto de la petición. */
export enum HttpRequestKey {
  /** `ClientInfo`, escrito por `OriginPolicyMiddleware`. */
  ClientInfo = 'platformHttpClientInfo',
  /** `EndpointCall`, escrito por `EndpointGuard`. */
  Call = 'platformHttpCall',
}
