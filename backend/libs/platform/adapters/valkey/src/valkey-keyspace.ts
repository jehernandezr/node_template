import { ConfigValidationError } from '@platform/config';

/** What a key prefix may contain: no `:`, so `<prefix>:*` in the ACL matches exactly this keyspace. */
export const VALKEY_KEY_PREFIX_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Leading segment of every key and pub/sub channel a service touches, usually `VALKEY_KEY_PREFIX` (the
 * service name). In AWS each service user has the ACL `~<prefix>:* &<prefix>:*`, so a key or channel outside
 * `<prefix>:` fails with `NOPERM`. There is no default prefix: a local run fails the same way a deploy would.
 */
export class ValkeyKeyspace {
  /** @throws ConfigValidationError for an empty prefix, or one with `:` or characters outside `[A-Za-z0-9_-]`. */
  constructor(readonly prefix: string) {
    if (!VALKEY_KEY_PREFIX_PATTERN.test(prefix)) {
      throw new ConfigValidationError([
        {
          path: 'keyPrefix',
          code: 'custom',
          message: 'expected 1 to 64 characters in [A-Za-z0-9_-]',
        },
      ]);
    }
  }

  /** `<prefix>:<part>:<part>...` */
  key(...parts: readonly string[]): string {
    return [this.prefix, ...parts].join(':');
  }
}
