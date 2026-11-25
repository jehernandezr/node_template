import { ContainerRuntime } from '@platform/kernel/test-utils';
import { randomUUID } from 'node:crypto';
import { Valkey } from 'iovalkey';
import {
  GenericContainer,
  Wait,
  type StartedTestContainer,
} from 'testcontainers';

/**
 * Real Valkey with the bloom module, started with Testcontainers. The
 * service connections log in as a user with the same ACL that Terraform
 * gives each service (`~<prefix>:* &<prefix>:*`), so a key or a channel
 * outside the namespace fails here as it would fail on AWS.
 */
export class ValkeyTestServer {
  static readonly IMAGE = 'valkey/valkey-bundle:8.1';

  /** Password of the service user. It is generated on each run and is not written anywhere. */
  readonly password = randomUUID();

  private container: StartedTestContainer | undefined;
  private admin: Valkey | undefined;
  private readonly clients: Valkey[] = [];

  constructor(readonly prefix: string) {}

  async start(): Promise<void> {
    this.container = await new GenericContainer(ValkeyTestServer.IMAGE)
      .withAutoCleanup(new ContainerRuntime(process.env).autoCleanup())
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
   * Returns the environment variables of a service that connects to this server, without
   * authentication: the container does not speak TLS, which the IAM modes require.
   */
  environment(): Record<string, string> {
    return {
      SERVICE_NAME: this.prefix,
      VALKEY_HOST: this.host,
      VALKEY_PORT: String(this.port),
    };
  }

  /** Opens a new connection as the service user, as another process would have it. */
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

  /** Opens an administrative connection, without the service ACL. */
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

  /** Changes the password of the service user and cuts its connections. */
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
