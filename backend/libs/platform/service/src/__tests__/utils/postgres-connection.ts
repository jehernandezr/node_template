/** Connection data for the PostgreSQL server of the integration tests. */
export interface PostgresConnection {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
}
