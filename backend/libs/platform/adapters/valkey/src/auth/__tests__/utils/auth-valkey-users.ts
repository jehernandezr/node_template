import { randomUUID } from 'node:crypto';
import { Valkey } from 'iovalkey';
import type { ValkeyTestServer } from '../../../__tests__/utils/valkey-test-server.js';

/**
 * The two auth Valkey users with the Terraform rules: the identity
 * writer and the services reader. Each one has its own password, which
 * is generated here and not written anywhere.
 */
export class AuthValkeyUsers {
  static readonly WRITER = 'auth-writer';
  static readonly READER = 'auth-reader';

  private readonly writerPassword = randomUUID();
  private readonly readerPassword = randomUUID();
  private readonly clients: Valkey[] = [];

  constructor(private readonly server: ValkeyTestServer) {}

  /** Creates or replaces the two users on the server. */
  async create(): Promise<void> {
    await this.server.superuser.call(
      'ACL',
      'SETUSER',
      AuthValkeyUsers.WRITER,
      'on',
      `>${this.writerPassword}`,
      '~auth:*',
      '&auth:*',
      '+@all',
      '-@dangerous',
    );
    await this.server.superuser.call(
      'ACL',
      'SETUSER',
      AuthValkeyUsers.READER,
      'on',
      `>${this.readerPassword}`,
      '%R~auth:*',
      '&auth:revocations',
      '+@all',
      '-@dangerous',
    );
  }

  writerClient(): Valkey {
    return this.connect(AuthValkeyUsers.WRITER, this.writerPassword);
  }

  readerClient(): Valkey {
    return this.connect(AuthValkeyUsers.READER, this.readerPassword);
  }

  /** Closes the open connections; the ones the server already cut do not count. */
  async close(): Promise<void> {
    await Promise.all(
      this.clients.map((client) => client.quit().catch(() => 0)),
    );
    this.clients.length = 0;
  }

  private connect(username: string, password: string): Valkey {
    const client = new Valkey({
      host: this.server.host,
      port: this.server.port,
      username,
      password,
      lazyConnect: true,
      enableReadyCheck: false,
      commandTimeout: 5_000,
    });
    this.clients.push(client);
    return client;
  }
}
