/** Una región de despliegue: su código, la URL de su API y el emisor de sus tokens. */
export interface Region {
  readonly code: string;
  readonly apiBaseUrl: string;
  readonly issuer: string;
}
