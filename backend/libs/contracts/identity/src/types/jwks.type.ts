/** Clave pública del conjunto JWKS con la que se verifican los access tokens. */
export interface Jwk {
  kty: string;
  crv: string;
  kid: string;
  use: string;
  alg: string;
  x: string;
  y: string;
}

/** Conjunto de claves públicas vigentes. Con rotación hay más de una. */
export interface Jwks {
  keys: Jwk[];
}
