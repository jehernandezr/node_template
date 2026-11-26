import { randomBytes } from 'node:crypto';
import { TestDatabaseServer } from '@platform/persistence/test-utils';
import type { PostgresConnection } from './postgres-connection.js';
import { ServiceDatabases } from './service-databases.js';

/**
 * The PostgreSQL the Jest run shares, as a suite sees it: each `provision` creates a catalog and two shards with
 * names no other suite uses, and `stop` drops what this instance created.
 */
export class ServicePostgresServer {
  private readonly created: string[] = [];

  constructor(private readonly databases = new TestDatabaseServer()) {}

  /** Checks that the run published the shared server. */
  async start(): Promise<void> {
    this.databases.connection();
  }

  /** Drops every database this instance provisioned. */
  async stop(): Promise<void> {
    await this.databases.drop(this.created.splice(0));
  }

  /**
   * Creates a catalog and two shards with names unique on the shared server.
   * @param owner Role that owns them; the superuser when absent.
   * @returns The new, empty databases.
   */
  async provision(owner?: string): Promise<ServiceDatabases> {
    const databases = this.named(randomBytes(4).toString('hex'));
    await this.databases.recreate(databases.names(), owner);
    this.created.push(...databases.names());
    return databases;
  }

  /**
   * The databases of a template set, without creating them: `TestDatabaseServer.cloneFromTemplates` does.
   * @param key Template key.
   * @returns The template catalog and shards.
   */
  templates(key: string): ServiceDatabases {
    return this.named(`tpl_${key}`);
  }

  /**
   * Creates the login role of a service unless an earlier suite of the run did.
   * @param role Role name.
   */
  async ensureServiceRole(role: string): Promise<void> {
    await this.databases.ensureRole(role, 'NOSUPERUSER NOBYPASSRLS');
  }

  /**
   * Password every service role of the run logs in with.
   * @returns The password of the run.
   */
  rolePassword(): string {
    return this.databases.rolePassword();
  }

  /** The shared server itself: extensions, drops and template clones. */
  get server(): TestDatabaseServer {
    return this.databases;
  }

  /** Superuser connection to the shared server. */
  connection(): PostgresConnection {
    const { host, port, username, password } = this.databases.connection();
    return { host, port, username, password };
  }

  private named(suffix: string): ServiceDatabases {
    return new ServiceDatabases(this.connection(), {
      catalog: `catalog_${suffix}`,
      shards: [`svc_${suffix}_shard_0`, `svc_${suffix}_shard_1`] as const,
    });
  }
}
