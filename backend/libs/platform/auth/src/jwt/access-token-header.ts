import type { JwtAlgorithm } from './jwt-algorithm.enum.js';

/** Header del access token: `{ alg: 'ES256', typ: 'at+jwt', kid }`. */
export interface AccessTokenHeader {
  readonly alg: JwtAlgorithm;
  readonly typ: string;
  readonly kid: string;
}
