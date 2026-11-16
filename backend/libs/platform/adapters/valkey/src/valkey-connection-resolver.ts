import { ConfigValidationError, type ConfigIssue } from '@platform/config';
import type { ValkeyAuthTokenProvider } from './valkey-auth-token-provider.js';
import { ValkeyAuthMode } from './valkey-auth-mode.enum.js';
import type { ValkeyConnectionOptions } from './valkey-connection-options.js';
import type { ValkeyConnectionSettings } from './valkey-connection-settings.js';
import type { ValkeyRuntimeOptions } from './valkey-runtime-options.js';
import type { ValkeyTokenAuth } from './valkey-token-auth.js';
import type { ValkeySettings } from './valkey.config.js';

/** Convierte la configuración en datos de conexión y revisa lo que un esquema plano no puede. */
export class ValkeyConnectionResolver {
  /**
   * @throws ConfigValidationError listando cada variable incoherente: `VALKEY_URL` y `VALKEY_HOST`
   *   a la vez o ninguna, o un modo IAM sin host, usuario, nombre de caché, TLS o proveedor de token.
   */
  resolve(
    settings: ValkeySettings,
    runtime: ValkeyRuntimeOptions = {},
    authToken?: ValkeyAuthTokenProvider,
  ): ValkeyConnectionSettings {
    const issues: ConfigIssue[] = [];
    const url = settings.VALKEY_URL;
    const host = settings.VALKEY_HOST;
    const endpoint =
      url !== undefined
        ? { url }
        : host !== undefined
          ? { host, port: settings.VALKEY_PORT, tls: settings.VALKEY_TLS }
          : undefined;
    if ((url === undefined) === (host === undefined)) {
      issues.push(
        this.issue(
          'VALKEY_URL',
          'defina exactamente una de VALKEY_URL y VALKEY_HOST',
        ),
      );
    }
    const iam = settings.VALKEY_AUTH !== ValkeyAuthMode.None;
    const auth = iam ? this.iamAuth(settings, authToken, issues) : undefined;
    if (issues.length > 0 || endpoint === undefined) {
      throw new ConfigValidationError(issues);
    }
    const connection: ValkeyConnectionOptions = {
      ...endpoint,
      username: settings.VALKEY_USER,
      connectionName: runtime.connectionName,
      connectTimeoutMs: runtime.connectTimeoutMs,
      commandTimeoutMs: runtime.commandTimeoutMs,
    };
    return { connection, auth };
  }

  /** La identidad del token sale de las mismas variables que la conexión. */
  private iamAuth(
    settings: ValkeySettings,
    authToken: ValkeyAuthTokenProvider | undefined,
    issues: ConfigIssue[],
  ): ValkeyTokenAuth | undefined {
    if (settings.VALKEY_HOST === undefined) {
      issues.push(
        this.issue('VALKEY_HOST', 'la autenticación IAM necesita VALKEY_HOST'),
      );
    }
    if (settings.VALKEY_USER === undefined) {
      issues.push(
        this.issue(
          'VALKEY_USER',
          'la autenticación IAM necesita el id de usuario',
        ),
      );
    }
    if (settings.VALKEY_CACHE_NAME === undefined) {
      issues.push(
        this.issue(
          'VALKEY_CACHE_NAME',
          'la autenticación IAM necesita el nombre de la caché',
        ),
      );
    }
    if (!settings.VALKEY_TLS) {
      issues.push(
        this.issue('VALKEY_TLS', 'la autenticación IAM solo funciona con TLS'),
      );
    }
    if (authToken === undefined) {
      issues.push(
        this.issue(
          'VALKEY_AUTH',
          'la autenticación IAM necesita un proveedor de token',
        ),
      );
    }
    const userId = settings.VALKEY_USER;
    const cacheName = settings.VALKEY_CACHE_NAME;
    if (
      authToken === undefined ||
      userId === undefined ||
      cacheName === undefined
    ) {
      return undefined;
    }
    return {
      provider: authToken,
      request: {
        userId,
        cacheName,
        serverless: settings.VALKEY_AUTH === ValkeyAuthMode.IamServerless,
      },
    };
  }

  private issue(path: string, message: string): ConfigIssue {
    return { path, code: 'custom', message };
  }
}
