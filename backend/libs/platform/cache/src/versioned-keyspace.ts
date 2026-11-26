import { IdGenerator } from '@platform/kernel';
import { CanonicalJson } from '@platform/primitives';
import type { CachePort } from './cache-port.js';
import { CacheInvalidArgumentError } from './errors/cache-invalid-argument.error.js';
import { CacheKeyTooLongError } from './errors/cache-key-too-long.error.js';
import { CacheGuard } from './errors/cache-guard.js';
import type { VersionedKeyspaceOptions } from './versioned-keyspace.options.js';

/**
 * Builds cache keys that carry a version token per namespace.
 * Changing the token makes all keys issued before unreachable at once.
 *
 * Tokens are random and never come from a counter. If the version key
 * disappears, a new token is created, so data written with the old
 * token cannot come back.
 *
 * Concurrency: the first use creates the token with `setIfAbsent` and reads it again,
 * so the first concurrent readers agree on a single token. A change
 * writes a new token; a reader that took the old token can only write
 * under the old key, which no later reader will build again.
 */
export class VersionedKeyspace {
  /** Default maximum length of any key, in characters. */
  static readonly DEFAULT_MAX_KEY_LENGTH = 512;

  /** Shape of a version token: a UUID. Any other value is replaced. */
  private static readonly TOKEN_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  private readonly prefix: string;
  private readonly maxKeyLength: number;
  private readonly ids: IdGenerator;

  constructor(
    private readonly cache: CachePort,
    options: VersionedKeyspaceOptions,
  ) {
    const prefix = options.prefix ?? 'cache';
    if (prefix === '' || prefix.includes(':')) {
      throw new CacheInvalidArgumentError(
        'prefix',
        'a non-empty string without ":"',
      );
    }
    this.prefix = prefix;
    this.maxKeyLength = CacheGuard.instance.positiveInteger(
      'maxKeyLength',
      options.maxKeyLength ?? VersionedKeyspace.DEFAULT_MAX_KEY_LENGTH,
    );
    this.ids = options.ids;
  }

  /**
   * Returns the current version token of a namespace. It is created on first use.
   * A corrupt or foreign token would produce keys of unbounded length: it is replaced.
   * Another writer may have won the race: the token that remained stored is read.
   * If it disappeared (eviction), a throwaway token leaves this read without cache.
   */
  async version(namespace: readonly string[]): Promise<string> {
    const key = this.versionKey(namespace);
    const existing = await this.cache.get(key);
    if (
      existing !== undefined &&
      VersionedKeyspace.TOKEN_PATTERN.test(existing)
    ) {
      return existing;
    }
    if (existing !== undefined) {
      return this.bump(namespace);
    }
    await this.cache.setIfAbsent(key, this.token());
    const stored = await this.cache.get(key);
    return stored !== undefined && VersionedKeyspace.TOKEN_PATTERN.test(stored)
      ? stored
      : this.token();
  }

  /** Replaces the version token. Returns the new token. */
  async bump(namespace: readonly string[]): Promise<string> {
    const token = this.token();
    await this.cache.set(this.versionKey(namespace), token);
    return token;
  }

  /**
   * Returns the cache key for `params` under the namespace's current token.
   * Validated before touching the store, so a bad call does not cost a round trip.
   * @throws CacheKeyTooLongError when the namespace makes the key too long.
   * @throws NonJsonValueError (primitives) when `params` is not canonical JSON.
   */
  async key(namespace: readonly string[], params: unknown): Promise<string> {
    const encoded = this.encodedNamespace(namespace);
    const digest = CanonicalJson.digest(params);
    const token = await this.version(namespace);
    return this.bounded(`${this.prefix}:data:${encoded}:v${token}:${digest}`);
  }

  private token(): string {
    return this.ids.next().toString();
  }

  private versionKey(namespace: readonly string[]): string {
    return this.bounded(
      `${this.prefix}:ver:${this.encodedNamespace(namespace)}`,
    );
  }

  /**
   * Encodes each segment so one with ':' does not collide with another
   * namespace, and rejects namespaces that do not fit in a key.
   * Encoding never shortens a segment: huge ones are rejected before encoding.
   */
  private encodedNamespace(namespace: readonly string[]): string {
    if (!Array.isArray(namespace)) {
      throw new CacheInvalidArgumentError('namespace', 'an array of strings');
    }
    const encoded = namespace
      .map((segment) => {
        if (typeof segment !== 'string') {
          throw new CacheInvalidArgumentError(
            'namespace',
            'an array of strings',
          );
        }
        this.bounded(segment);
        return encodeURIComponent(segment);
      })
      .join(':');
    return this.bounded(encoded);
  }

  private bounded(key: string): string {
    if (key.length > this.maxKeyLength) {
      throw new CacheKeyTooLongError(key.length, this.maxKeyLength);
    }
    return key;
  }
}
