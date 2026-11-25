/** Public key of the JWKS set used to verify access tokens. */
export interface Jwk {
  kty: string;
  crv: string;
  kid: string;
  use: string;
  alg: string;
  x: string;
  y: string;
}

/** Set of current public keys. With rotation there is more than one. */
export interface Jwks {
  keys: Jwk[];
}
