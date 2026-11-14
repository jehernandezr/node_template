import { randomUUID } from 'node:crypto';
import type { CachePort } from './cache-port.js';
import { CacheInvalidArgumentError, CacheKeyTooLongError } from './errors.js';
import { queryDigest } from './stable-hash.js';

/** Default bound for every key the keyspace builds, in characters. */
export const DEFAULT_MAX_CACHE_KEY_LENGTH = 512;

/** Options for {@link VersionedKeyspace}. */
export interface VersionedKeyspaceOptions {
  /** Leading segment of every key. Defaults to `cache`. Cannot contain ':'. */
  prefix?: string;
  /** Longest key accepted. Defaults to {@link DEFAULT_MAX_CACHE_KEY_LENGTH}. */
  maxKeyLength?: number;
}

/** Shape of a version token: a random UUID. Anything else in the store is replaced. */
const TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Builds cache keys that embed a per-namespace version token.
 * Bumping the token makes every previously issued key unreachable at once.
 *
 * Tokens are random and never derived from a counter. If a version key is evicted,
 * a new random token is created, so data written under the old token cannot come back.
 *
 * Concurrency: the first use creates the token with `setIfAbsent` and reads it
 * back, so concurrent first readers agree on one token. A bump writes a fresh
 * token; a reader that took the old token before the bump can only write under
 * the old key, which no reader after the bump will ever build again.
 */
export class VersionedKeyspace {
  private readonly prefix: string;
  private readonly maxKeyLength: number;

  constructor(
    private readonly cache: CachePort,
    options: VersionedKeyspaceOptions = {},
  ) {
    const prefix = options.prefix ?? 'cache';
    if (prefix === '' || prefix.includes(':')) {
      throw new CacheInvalidArgumentError(
        'prefix',
        'a non-empty string without ":"',
      );
    }
    const maxKeyLength = options.maxKeyLength ?? DEFAULT_MAX_CACHE_KEY_LENGTH;
    if (!Number.isInteger(maxKeyLength) || maxKeyLength < 1) {
      throw new CacheInvalidArgumentError('maxKeyLength', 'an integer >= 1');
    }
    this.prefix = prefix;
    this.maxKeyLength = maxKeyLength;
  }

  /** Current version token of a namespace. Created on first use when missing. */
  async version(namespace: readonly string[]): Promise<string> {
    const key = this.versionKey(namespace);
    const existing = await this.cache.get(key);
    if (existing !== undefined && TOKEN_PATTERN.test(existing)) {
      return existing;
    }
    if (existing !== undefined) {
      // A corrupt or foreign token would build unbounded keys: replace it.
      return this.bump(namespace);
    }
    await this.cache.setIfAbsent(key, randomUUID());
    // Another writer may have won the race; read back the stored token.
    const stored = await this.cache.get(key);
    // If it vanished (eviction), a throwaway token keeps this read uncached.
    return stored !== undefined && TOKEN_PATTERN.test(stored)
      ? stored
      : randomUUID();
  }

  /** Replaces the version token. Returns the new token. */
  async bump(namespace: readonly string[]): Promise<string> {
    const token = randomUUID();
    await this.cache.set(this.versionKey(namespace), token);
    return token;
  }

  /**
   * Cache key for `params` under the namespace's current version token.
   * @throws CacheKeyTooLongError when the namespace makes the key too long.
   * @throws NonJsonValueError (primitives) when `params` is not JSON.
   */
  async key(namespace: readonly string[], params: unknown): Promise<string> {
    // Validate before touching the store, so a bad call costs no round trip.
    const encoded = this.encodedNamespace(namespace);
    const digest = queryDigest(params);
    const token = await this.version(namespace);
    return this.bounded(`${this.prefix}:data:${encoded}:v${token}:${digest}`);
  }

  private versionKey(namespace: readonly string[]): string {
    return this.bounded(
      `${this.prefix}:ver:${this.encodedNamespace(namespace)}`,
    );
  }

  /**
   * Encodes each segment so that segments containing ':' cannot collide with
   * other namespaces, and rejects namespaces that cannot fit in a key.
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
        // Encoding never shortens a segment: reject huge ones before encoding.
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
