/** JWK público de una clave EC P-256 que firma access tokens. */
export interface PublicJwk {
  readonly kty: 'EC';
  readonly crv: 'P-256';
  readonly x: string;
  readonly y: string;
  readonly kid: string;
  readonly use: 'sig';
  readonly alg: 'ES256';
}
