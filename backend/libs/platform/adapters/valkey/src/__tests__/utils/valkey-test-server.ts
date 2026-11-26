import { randomUUID } from 'node:crypto';
import { Valkey } from 'iovalkey';
import { SharedValkeyHost } from './shared-valkey-host.js';
import type { ValkeyTestHost } from './valkey-test-host.js';

/**
 * Real Valkey with the bloom module: by default the one the Jest run shares. Suites run one at a time on it and Jest
 * loads this class again for each test file, so the first server a suite starts empties Valkey and the suite sees
 * it as fresh as its own container. The service connections log in as a user with the same ACL that Terraform gives each service
 * (`~<prefix>:* &<prefix>:*`), so a key or a channel outside the namespace fails here as it would fail on AWS.
 */
export class ValkeyTestServer {
  /** Password of the service user. It is generated on each run and is not written anywhere. */
  readonly password = randomUUID();

  private static suiteStarted = false;

  private admin: Valkey | undefined;
  private readonly clients: Valkey[] = [];

  /**
   * @param prefix Key prefix and user name of the service.
   * @param server Where the Valkey runs: the shared one unless the test needs one of its own.
   */
  constructor(
    readonly prefix: string,
    private readonly server: ValkeyTestHost = new SharedValkeyHost(),
  ) {}

  /** Connects, empties Valkey if this is the suite's first server, and creates the service user. */
  async start(): Promise<void> {
    await this.server.start();
    this.admin = new Valkey(this.adminUrl);
    if (!ValkeyTestServer.suiteStarted) {
      ValkeyTestServer.suiteStarted = true;
      await this.flush();
    }
    await this.admin.call(
      'ACL',
      'SETUSER',
      this.prefix,
      'reset',
      'on',
      `>${this.password}`,
      `~${this.prefix}:*`,
      `&${this.prefix}:*`,
      '+@all',
      '-@dangerous',
    );
  }

  /** Closes every connection and releases the server. */
  async stop(): Promise<void> {
    await Promise.all(
      this.clients.map((client) => client.quit().catch(() => 0)),
    );
    await this.admin?.quit().catch(() => 0);
    await this.server.stop();
  }

  get host(): string {
    return this.server.host();
  }

  get port(): number {
    return this.server.port();
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

  /** Empties the whole server, including what other servers of the same suite wrote. */
  async flush(): Promise<void> {
    await this.superuser.call('FLUSHALL');
  }

  /**
   * Lists the keys that match a pattern.
   * @param pattern `KEYS` glob.
   * @returns The matching keys.
   */
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
}
