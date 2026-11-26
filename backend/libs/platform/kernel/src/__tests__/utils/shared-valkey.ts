/** Where the shared test Valkey listens; its default user has no password. */
export interface SharedValkey {
  readonly host: string;
  readonly port: number;
}
