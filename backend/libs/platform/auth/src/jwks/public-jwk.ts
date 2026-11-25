/** Public JWK of an EC P-256 key that signs access tokens. */
export interface PublicJwk {
  readonly kty: 'EC';
  readonly crv: 'P-256';
  readonly x: string;
  readonly y: string;
  readonly kid: string;
  readonly use: 'sig';
  readonly alg: 'ES256';
}
