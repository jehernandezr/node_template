/** Dirección de un nodo de PostgreSQL. */
export interface DatabaseEndpoint {
  readonly host: string;
  readonly port: number;
}
