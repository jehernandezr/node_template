import { Valkey } from 'iovalkey';
import type { ValkeyAuthTokenProvider } from './valkey-auth-token-provider.js';
import type { ValkeyConnectionOptions } from './valkey-connection-options.js';
import type { ValkeyConnectionResolver } from './valkey-connection-resolver.js';
import type { ValkeyRuntimeOptions } from './valkey-runtime-options.js';
import type { ValkeyTokenAuth } from './valkey-token-auth.js';
import type { ValkeySettings } from './valkey.config.js';

/**
 * Crea clientes de iovalkey desde la configuración: por URL y sin
 * autenticación en local, o con un token IAM nuevo en cada conexión en AWS.
 * Quien crea un cliente lo cierra con `quit()`.
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
   * Abre una conexión nueva. Una por cliente de comandos y otra para el
   * suscriptor de pub/sub, que no puede compartirla. Un token IAM vive 15
   * minutos y solo se revisa en `AUTH`; por eso cada conexión pide el suyo y
   * no se usa `client.duplicate()`, que copiaría el token pero no quien lo renueva.
   * @throws ConfigValidationError listando cada variable incoherente.
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
    // La primera conexión arranca aquí con el token en mano; las fallas salen en los comandos
    // y el cliente sigue reconectando.
    client.connect().catch(() => undefined);
    this.renewOnReconnect(client, auth);
    return client;
  }

  /**
   * Conecta con el primer comando, reintenta un comando una sola vez mientras
   * reconecta (así una caída falla rápido y el breaker puede abrir) y acota cada comando.
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
   * Pone una contraseña nueva antes de cada reconexión: iovalkey vuelve a
   * llamar a `connect()` tras una caída y lee `options.password` al enviar `AUTH`.
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
