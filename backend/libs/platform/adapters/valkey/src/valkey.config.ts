import { ConfigSection, envBoolean, envNumber } from '@platform/config';
import { z } from 'zod';
import { ValkeyAuthMode } from './valkey-auth-mode.enum.js';
import { ValkeyKeyspace } from './valkey-keyspace.js';

/**
 * Variables of the Valkey adapter, with the names injected by the Terraform
 * `service` stack. The combinations a flat schema cannot
 * validate (URL or host, complete IAM mode) are checked by `ValkeyConnectionResolver`.
 */
export const valkeyConfigSchema = z.object({
  /** Local: `redis://` or `rediss://` URL. Mutually exclusive with `VALKEY_HOST`. */
  VALKEY_URL: z
    .string()
    .trim()
    .regex(/^rediss?:\/\/\S+$/, 'expected a redis:// or rediss:// URL')
    .optional(),
  /** AWS: cache endpoint. */
  VALKEY_HOST: z.string().trim().min(1).optional(),
  VALKEY_PORT: envNumber({ min: 1, max: 65_535 }).default(6379),
  VALKEY_TLS: envBoolean().default(false),
  /** ACL user; with IAM it is also the user id the token names. */
  VALKEY_USER: z.string().trim().min(1).optional(),
  VALKEY_AUTH: z.enum(ValkeyAuthMode).default(ValkeyAuthMode.None),
  /** With IAM: cache name (not its endpoint), the host that signs the token. */
  VALKEY_CACHE_NAME: z.string().trim().min(1).optional(),
  /**
   * First segment of every key and channel; the ACL only allows `<prefix>:*`.
   * Without a value, `SERVICE_NAME` is used.
   */
  VALKEY_KEY_PREFIX: z
    .string()
    .trim()
    .regex(
      ValkeyKeyspace.PREFIX_PATTERN,
      'expected 1 to 64 characters in [A-Za-z0-9_-]',
    )
    .optional(),
});

/** Validated configuration of the Valkey adapter. */
export type ValkeySettings = z.infer<typeof valkeyConfigSchema>;

/** Configuration section that `ValkeyModule` validates at startup. */
export const ValkeyConfig = new ConfigSection<ValkeySettings>(
  'valkey',
  valkeyConfigSchema,
);
