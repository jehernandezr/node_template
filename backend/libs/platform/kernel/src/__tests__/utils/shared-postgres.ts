/** Where the shared test PostgreSQL listens and how its superuser logs in. */
export interface SharedPostgres {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  /** Database the superuser connects to for administrative statements. */
  readonly adminDatabase: string;
}
