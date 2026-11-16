import { randomUUID } from 'node:crypto';
import { Valkey } from 'iovalkey';
import {
  GenericContainer,
  Wait,
  type StartedTestContainer,
} from 'testcontainers';

/**
 * Valkey real con el módulo de bloom, levantado con Testcontainers. Las
 * conexiones del servicio entran como un usuario con la misma ACL que Terraform
 * da a cada servicio (`~<prefijo>:* &<prefijo>:*`), así una llave o un canal
 * fuera del espacio falla aquí como fallaría en AWS.
 */
export class ValkeyTestServer {
  static readonly IMAGE = 'valkey/valkey-bundle:8.1';

  /** Contraseña del usuario de servicio. Se genera en cada corrida y no se escribe en ningún lado. */
  readonly password = randomUUID();

  private container: StartedTestContainer | undefined;
  private admin: Valkey | undefined;
  private readonly clients: Valkey[] = [];

  constructor(readonly prefix: string) {}

  async start(): Promise<void> {
    this.container = await new GenericContainer(ValkeyTestServer.IMAGE)
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .start();
    this.admin = new Valkey(this.adminUrl);
    await this.admin.call(
      'ACL',
      'SETUSER',
      this.prefix,
      'on',
      `>${this.password}`,
      `~${this.prefix}:*`,
      `&${this.prefix}:*`,
      '+@all',
      '-@dangerous',
    );
  }

  async stop(): Promise<void> {
    await Promise.all(
      this.clients.map((client) => client.quit().catch(() => 0)),
    );
    await this.admin?.quit().catch(() => 0);
    await this.container?.stop();
  }

  get host(): string {
    return this.started.getHost();
  }

  get port(): number {
    return this.started.getMappedPort(6379);
  }

  /**
   * Variables de entorno de un servicio que se conecta a este servidor, sin
   * autenticación: el contenedor no habla TLS, que exigen los modos IAM.
   */
  environment(): Record<string, string> {
    return {
      SERVICE_NAME: this.prefix,
      VALKEY_HOST: this.host,
      VALKEY_PORT: String(this.port),
    };
  }

  /** Conexión nueva como el usuario del servicio, como la tendría otro proceso. */
  connect(): Valkey {
    const client = new Valkey({
      host: this.host,
      port: this.port,
      username: this.prefix,
      password: this.password,
      commandTimeout: 5_000,
      lazyConnect: true,
    });
    this.clients.push(client);
    return client;
  }

  /** Conexión administrativa, sin la ACL del servicio. */
  get superuser(): Valkey {
    if (this.admin === undefined) {
      throw new Error('the server is not started');
    }
    return this.admin;
  }

  async flush(): Promise<void> {
    await this.superuser.call('FLUSHALL');
  }

  async keys(pattern: string): Promise<string[]> {
    return (await this.superuser.call('KEYS', pattern)) as string[];
  }

  /** Cambia la contraseña del usuario del servicio y corta sus conexiones. */
  async rotatePassword(next: string): Promise<void> {
    await this.superuser.call(
      'ACL',
      'SETUSER',
      this.prefix,
      'resetpass',
      `>${next}`,
    );
    await this.superuser.call('CLIENT', 'KILL', 'USER', this.prefix);
  }

  private get adminUrl(): string {
    return `redis://${this.host}:${this.port}`;
  }

  private get started(): StartedTestContainer {
    if (this.container === undefined) {
      throw new Error('the server is not started');
    }
    return this.container;
  }
}
