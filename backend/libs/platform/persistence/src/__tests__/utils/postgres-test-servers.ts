import type { SharedPostgres } from '@platform/kernel/test-utils';

/** A PostgreSQL that test databases are created on: the one the Jest run shares, or one a suite starts for itself. */
export interface PostgresTestServers {
  /**
   * The server and its superuser.
   * @returns Where it listens and how the superuser logs in.
   */
  postgres(): SharedPostgres;

  /**
   * Password every service role on the server logs in with.
   * @returns The password.
   */
  rolePassword(): string;
}
