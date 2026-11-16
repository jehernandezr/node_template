import {
  ConfigValidationError,
  envBoolean,
  envNumber,
  type ConfigIssue,
} from '@platform/config';
import { z } from 'zod';
import type { Valkey } from 'iovalkey';
import {
  createTokenAuthenticatedValkeyClient,
  createValkeyClient,
  type ValkeyAuthTokenProvider,
  type ValkeyConnectionOptions,
} from './valkey-client.js';
import {
  ValkeyKeyspace,
  VALKEY_KEY_PREFIX_PATTERN,
} from './valkey-keyspace.js';

/** How a connection authenticates. */
export enum ValkeyAuthMode {
  /** No `AUTH`, as the local server of docker compose. */
  None = 'none',
  /** ElastiCache IAM token for a replication group. */
  Iam = 'iam',
  /** ElastiCache IAM token for a serverless cache, the one Terraform creates. */
  IamServerless = 'iam-serverless',
}

/**
 * Variables of the Valkey adapter, with the names the `service` Terraform stack injects. A service extends
 * its configuration with `baseConfigSchema.extend(valkeyConfigSchema.shape)`, then turns it into client
 * options with {@link valkeyConnectionFromConfig}, which checks the combinations a flat schema cannot.
 */
export const valkeyConfigSchema = z.object({
  /** Local: `redis://` or `rediss://` URL. Exclusive with `VALKEY_HOST`. */
  VALKEY_URL: z
    .string()
    .trim()
    .regex(/^rediss?:\/\/\S+$/, 'expected a redis:// or rediss:// URL')
    .optional(),
  /** AWS: endpoint of the cache. */
  VALKEY_HOST: z.string().trim().min(1).optional(),
  VALKEY_PORT: envNumber({ min: 1, max: 65_535 }).default(6379),
  VALKEY_TLS: envBoolean().default(false),
  /** ACL user; with IAM it is also the user id the token names. */
  VALKEY_USER: z.string().trim().min(1).optional(),
  VALKEY_AUTH: z.enum(ValkeyAuthMode).default(ValkeyAuthMode.None),
  /** With IAM: name of the cache (not its endpoint), the host the token signs. */
  VALKEY_CACHE_NAME: z.string().trim().min(1).optional(),
  /** Leading segment of every key and channel; the ACL only allows `<prefix>:*`. */
  VALKEY_KEY_PREFIX: z
    .string()
    .trim()
    .regex(
      VALKEY_KEY_PREFIX_PATTERN,
      'expected 1 to 64 characters in [A-Za-z0-9_-]',
    ),
});

/** Validated configuration of the Valkey adapter. */
export type ValkeyConfig = z.infer<typeof valkeyConfigSchema>;

/** Values that come from the runtime rather than the environment. */
export interface ValkeyRuntimeOptions {
  /** Required with an IAM mode, for example `elastiCacheIamAuthToken` of `@platform/adapters-aws`. */
  readonly authToken?: ValkeyAuthTokenProvider;
  readonly connectionName?: string;
  readonly connectTimeoutMs?: number;
  readonly commandTimeoutMs?: number;
}

function issue(path: string, message: string): ConfigIssue {
  return { path, code: 'custom', message };
}

/** Connection settings resolved from the configuration. */
export interface ValkeyConnectionSettings {
  readonly connection: ValkeyConnectionOptions;
  /** Present with an IAM mode: each connection authenticates with a fresh token. */
  readonly authToken?: ValkeyAuthTokenProvider;
}

/**
 * Connection settings from the configuration.
 * @throws ConfigValidationError listing every inconsistent variable: both or neither of `VALKEY_URL` and
 *   `VALKEY_HOST`, or an IAM mode without host, user, cache name, TLS or token provider.
 */
export function valkeyConnectionFromConfig(
  config: ValkeyConfig,
  runtime: ValkeyRuntimeOptions = {},
): ValkeyConnectionSettings {
  const issues: ConfigIssue[] = [];
  const url = config.VALKEY_URL;
  const host = config.VALKEY_HOST;
  const endpoint =
    url !== undefined
      ? { url }
      : host !== undefined
        ? { host, port: config.VALKEY_PORT, tls: config.VALKEY_TLS }
        : undefined;
  if ((url === undefined) === (host === undefined)) {
    issues.push(
      issue('VALKEY_URL', 'set exactly one of VALKEY_URL and VALKEY_HOST'),
    );
  }
  const iam = config.VALKEY_AUTH !== ValkeyAuthMode.None;
  if (iam) {
    if (host === undefined) {
      issues.push(issue('VALKEY_HOST', 'IAM authentication needs VALKEY_HOST'));
    }
    if (config.VALKEY_USER === undefined) {
      issues.push(issue('VALKEY_USER', 'IAM authentication needs the user id'));
    }
    if (config.VALKEY_CACHE_NAME === undefined) {
      issues.push(
        issue('VALKEY_CACHE_NAME', 'IAM authentication needs the cache name'),
      );
    }
    if (!config.VALKEY_TLS) {
      issues.push(
        issue('VALKEY_TLS', 'IAM authentication only works over TLS'),
      );
    }
    if (runtime.authToken === undefined) {
      issues.push(
        issue('VALKEY_AUTH', 'IAM authentication needs a token provider'),
      );
    }
  }
  if (issues.length > 0 || endpoint === undefined) {
    throw new ConfigValidationError(issues);
  }
  return {
    connection: {
      ...endpoint,
      username: config.VALKEY_USER,
      connectionName: runtime.connectionName,
      connectTimeoutMs: runtime.connectTimeoutMs,
      commandTimeoutMs: runtime.commandTimeoutMs,
    },
    authToken: iam ? runtime.authToken : undefined,
  };
}

/**
 * Creates a client from the configuration: by URL without authentication locally, or with a fresh IAM token
 * per connection in AWS.
 * @throws ConfigValidationError as {@link valkeyConnectionFromConfig}.
 */
export async function createValkeyClientFromConfig(
  config: ValkeyConfig,
  runtime: ValkeyRuntimeOptions = {},
): Promise<Valkey> {
  const { connection, authToken } = valkeyConnectionFromConfig(config, runtime);
  return authToken === undefined
    ? createValkeyClient(connection)
    : createTokenAuthenticatedValkeyClient(connection, authToken);
}

/** Keyspace of the service from `VALKEY_KEY_PREFIX`. */
export function valkeyKeyspaceFromConfig(
  config: Pick<ValkeyConfig, 'VALKEY_KEY_PREFIX'>,
): ValkeyKeyspace {
  return new ValkeyKeyspace(config.VALKEY_KEY_PREFIX);
}
