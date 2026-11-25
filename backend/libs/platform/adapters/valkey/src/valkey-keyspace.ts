import { ConfigValidationError } from '@platform/config';
import type { ValkeySettings } from './valkey.config.js';

/**
 * First segment of every key and channel a service touches. On AWS each
 * service user has the ACL `~<prefix>:* &<prefix>:*`, so a
 * key or a channel outside `<prefix>:` fails with `NOPERM`. The prefix is
 * `VALKEY_KEY_PREFIX` and, without it, `SERVICE_NAME`.
 */
export class ValkeyKeyspace {
  /** What a prefix may contain: no `:`, so the ACL `<prefix>:*` covers exactly this namespace. */
  static readonly PREFIX_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

  /**
   * @param source Variable the prefix comes from, to name it in the error.
   * @throws ConfigValidationError with an empty prefix, with `:` or with characters outside `[A-Za-z0-9_-]`.
   */
  constructor(
    readonly prefix: string,
    source = 'keyPrefix',
  ) {
    if (!ValkeyKeyspace.PREFIX_PATTERN.test(prefix)) {
      throw new ConfigValidationError([
        {
          path: source,
          code: 'custom',
          message: 'se esperan de 1 a 64 caracteres en [A-Za-z0-9_-]',
        },
      ]);
    }
  }

  /**
   * Returns the service key namespace: `VALKEY_KEY_PREFIX` if defined, or the
   * service name.
   * @throws ConfigValidationError if the chosen prefix does not match {@link ValkeyKeyspace.PREFIX_PATTERN}.
   */
  static fromSettings(
    valkey: Pick<ValkeySettings, 'VALKEY_KEY_PREFIX'>,
    serviceName: string,
  ): ValkeyKeyspace {
    const explicit = valkey.VALKEY_KEY_PREFIX;
    return explicit === undefined
      ? new ValkeyKeyspace(serviceName, 'SERVICE_NAME')
      : new ValkeyKeyspace(explicit, 'VALKEY_KEY_PREFIX');
  }

  /** `<prefijo>:<parte>:<parte>...` */
  key(...parts: readonly string[]): string {
    return [this.prefix, ...parts].join(':');
  }
}
