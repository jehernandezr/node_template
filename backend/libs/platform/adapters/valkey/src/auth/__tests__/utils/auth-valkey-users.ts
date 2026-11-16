import { randomUUID } from 'node:crypto';
import { Valkey } from 'iovalkey';
import type { ValkeyTestServer } from '../../../__tests__/utils/valkey-test-server.js';

/**
 * Los dos usuarios de Valkey de auth con las reglas de Terraform: el escritor de
 * identity y el lector de los servicios. Cada uno tiene su propia contraseña, que
 * se genera aquí y no se escribe en ningún lado.
 */
export class AuthValkeyUsers {
  static readonly WRITER = 'auth-writer';
  static readonly READER = 'auth-reader';

  private readonly writerPassword = randomUUID();
  private readonly readerPassword = randomUUID();
  private readonly clients: Valkey[] = [];

  constructor(private readonly server: ValkeyTestServer) {}

  /** Crea o reemplaza los dos usuarios en el servidor. */
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

  /** Cierra las conexiones abiertas; las que el servidor ya cortó no cuentan. */
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
