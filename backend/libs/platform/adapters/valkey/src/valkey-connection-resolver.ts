import { ConfigValidationError, type ConfigIssue } from '@platform/config';
import type { ValkeyAuthTokenProvider } from './valkey-auth-token-provider.js';
import { ValkeyAuthMode } from './valkey-auth-mode.enum.js';
import type { ValkeyConnectionOptions } from './valkey-connection-options.js';
import type { ValkeyConnectionSettings } from './valkey-connection-settings.js';
import type { ValkeyRuntimeOptions } from './valkey-runtime-options.js';
import type { ValkeyTokenAuth } from './valkey-token-auth.js';
import type { ValkeySettings } from './valkey.config.js';

/** Converts the configuration into connection data and checks what a flat schema cannot. */
export class ValkeyConnectionResolver {
  /**
   * Resolves the connection settings from the configuration: URL locally, host, TLS and IAM in AWS.
   * @param settings Valkey configuration.
   * @param runtime Runtime overrides.
   * @param authToken Provider of IAM tokens.
   * @returns The connection settings.
   * @throws ConfigValidationError listing each inconsistent variable: `VALKEY_URL` and `VALKEY_HOST`
   *   both or neither, or an IAM mode without host, user, cache name, TLS or token provider.
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
          'define exactly one of VALKEY_URL and VALKEY_HOST',
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

  /** The token identity comes from the same variables as the connection. */
  private iamAuth(
    settings: ValkeySettings,
    authToken: ValkeyAuthTokenProvider | undefined,
    issues: ConfigIssue[],
  ): ValkeyTokenAuth | undefined {
    if (settings.VALKEY_HOST === undefined) {
      issues.push(
        this.issue('VALKEY_HOST', 'IAM authentication needs VALKEY_HOST'),
      );
    }
    if (settings.VALKEY_USER === undefined) {
      issues.push(
        this.issue('VALKEY_USER', 'IAM authentication needs the user id'),
      );
    }
    if (settings.VALKEY_CACHE_NAME === undefined) {
      issues.push(
        this.issue(
          'VALKEY_CACHE_NAME',
          'IAM authentication needs the cache name',
        ),
      );
    }
    if (!settings.VALKEY_TLS) {
      issues.push(
        this.issue('VALKEY_TLS', 'IAM authentication only works with TLS'),
      );
    }
    if (authToken === undefined) {
      issues.push(
        this.issue('VALKEY_AUTH', 'IAM authentication needs a token provider'),
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
