/** A deployment region: its code, its API URL and its token issuer. */
export interface Region {
  readonly code: string;
  readonly apiBaseUrl: string;
  readonly issuer: string;
}
