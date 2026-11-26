import { Valkey } from 'iovalkey';
import type { ValkeyAuthTokenProvider } from './valkey-auth-token-provider.js';
import type { ValkeyConnectionOptions } from './valkey-connection-options.js';
import type { ValkeyConnectionResolver } from './valkey-connection-resolver.js';
import type { ValkeyRuntimeOptions } from './valkey-runtime-options.js';
import type { ValkeyTokenAuth } from './valkey-token-auth.js';
import type { ValkeySettings } from './valkey.config.js';

/**
 * Creates iovalkey clients from the configuration: by URL and without
 * authentication locally, or with a new IAM token on each connection on AWS.
 * Whoever creates a client closes it with `quit()`.
 */
export class ValkeyClientFactory {
  private static readonly DEFAULT_CONNECT_TIMEOUT_MS = 2_000;
  private static readonly DEFAULT_COMMAND_TIMEOUT_MS = 1_000;

  constructor(
    private readonly resolver: ValkeyConnectionResolver,
    private readonly settings: ValkeySettings,
    private readonly runtime: ValkeyRuntimeOptions,
    private readonly authToken: ValkeyAuthTokenProvider | undefined,
  ) {}

  /**
   * Opens a new connection. One per command client and another for the
   * pub/sub subscriber, which cannot share it. An IAM token lives 15
   * minutes and is only checked on `AUTH`; that is why each connection requests its own and
   * `client.duplicate()` is not used, since it would copy the token but not what renews it.
   * The first connection starts here with the token in hand; failures surface in the commands and the client keeps reconnecting.
   * @throws ConfigValidationError listing each inconsistent variable.
   */
  async create(): Promise<Valkey> {
    const { connection, auth } = this.resolver.resolve(
      this.settings,
      this.runtime,
      this.authToken,
    );
    const client = this.open(connection);
    if (auth === undefined) {
      return client;
    }
    client.options.password = await auth.provider.token(auth.request);
    client.connect().catch(() => undefined);
    this.renewOnReconnect(client, auth);
    return client;
  }

  /**
   * Connects on the first command, retries a command only once while
   * reconnecting (so an outage fails fast and the breaker can open) and bounds each command.
   */
  private open(options: ValkeyConnectionOptions): Valkey {
    const common = {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout:
        options.connectTimeoutMs ??
        ValkeyClientFactory.DEFAULT_CONNECT_TIMEOUT_MS,
      commandTimeout:
        options.commandTimeoutMs ??
        ValkeyClientFactory.DEFAULT_COMMAND_TIMEOUT_MS,
      connectionName: options.connectionName,
      username: options.username,
    };
    return 'url' in options
      ? new Valkey(options.url, common)
      : new Valkey({
          ...common,
          host: options.host,
          port: options.port,
          tls: options.tls ? {} : undefined,
        });
  }

  /**
   * Sets a new password before each reconnection: iovalkey calls
   * `connect()` again after an outage and reads `options.password` when sending `AUTH`.
   */
  private renewOnReconnect(client: Valkey, auth: ValkeyTokenAuth): void {
    const connect = client.connect.bind(client);
    let refreshing: Promise<void> | undefined;
    client.connect = (callback) => {
      refreshing ??= auth.provider
        .token(auth.request)
        .then((token) => {
          client.options.password = token;
        })
        .finally(() => {
          refreshing = undefined;
        });
      const connected = refreshing.then(() => connect());
      if (callback !== undefined) {
        connected.then(
          () => callback(null),
          (error: Error) => callback(error),
        );
      }
      return connected;
    };
  }
}
