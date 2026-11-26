import { randomBytes } from 'node:crypto';
import {
  ContainerRuntime,
  type SharedPostgres,
} from '@platform/kernel/test-utils';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import type { PostgresTestServers } from './postgres-test-servers.js';

/**
 * A PostgreSQL of a suite's own, for a suite that changes server-level state the other suites of the run would see:
 * roles, publications, subscriptions and replication slots. It runs the image and settings of the shared server. A
 * suite that uses it is tagged `@isolated-server` and listed in `backend/isolated-server-suites.json`. `IMAGE` and
 * `SETTINGS` repeat those of `backend/jest.servers.cjs`, and a guard test keeps the two equal.
 */
export class IsolatedPostgresServer implements PostgresTestServers {
  static readonly IMAGE = 'pgvector/pgvector:0.8.7-pg17';
  static readonly SETTINGS = [
    'fsync=off',
    'synchronous_commit=off',
    'full_page_writes=off',
    'wal_level=logical',
    'max_connections=400',
    'max_replication_slots=20',
    'max_wal_senders=20',
  ];
  private static readonly ADMIN_DATABASE = 'postgres';

  private readonly password = randomBytes(18).toString('base64url');
  private container: StartedPostgreSqlContainer | undefined;

  /** Starts the server; resolves once it accepts connections. */
  async start(): Promise<void> {
    this.container = await new PostgreSqlContainer(IsolatedPostgresServer.IMAGE)
      .withCommand([
        'postgres',
        ...IsolatedPostgresServer.SETTINGS.flatMap((setting) => [
          '-c',
          setting,
        ]),
      ])
      .withAutoCleanup(new ContainerRuntime(process.env).autoCleanup())
      .start();
  }

  /** Stops the server and removes its container. */
  async stop(): Promise<void> {
    await this.container?.stop();
  }

  /**
   * The server and its superuser.
   * @returns Where it listens and how the superuser logs in.
   * @throws Error when the server was not started.
   */
  postgres(): SharedPostgres {
    const container = this.started();
    return {
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      adminDatabase: IsolatedPostgresServer.ADMIN_DATABASE,
    };
  }

  /**
   * Password every service role of this server logs in with.
   * @returns A password generated for this server.
   */
  rolePassword(): string {
    return this.password;
  }

  private started(): StartedPostgreSqlContainer {
    if (this.container === undefined) {
      throw new Error('IsolatedPostgresServer.start() was not called');
    }
    return this.container;
  }
}
