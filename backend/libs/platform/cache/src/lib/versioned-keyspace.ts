import { randomUUID } from 'node:crypto';
import type { CachePort } from './cache-port.js';
import { stableDigest } from './stable-hash.js';

/** Options for {@link VersionedKeyspace}. */
export interface VersionedKeyspaceOptions {
  /** Leading segment of every key. Defaults to `cache`. */
  prefix?: string;
}

/**
 * Builds cache keys that embed a per-namespace version token.
 * Bumping the token makes every previously issued key unreachable at once.
 *
 * Tokens are random and never derived from a counter. If a version key is evicted,
 * a new random token is created, so data written under the old token cannot come back.
 */
export class VersionedKeyspace {
  private readonly prefix: string;

  constructor(
    private readonly cache: CachePort,
    options: VersionedKeyspaceOptions = {},
  ) {
    this.prefix = options.prefix ?? 'cache';
  }

  /** Current version token of a namespace. Created on first use when missing. */
  async version(namespace: readonly string[]): Promise<string> {
    const key = this.versionKey(namespace);
    const existing = await this.cache.get(key);
    if (existing !== undefined) {
      return existing;
    }
    await this.cache.setIfAbsent(key, randomUUID());
    // Another writer may have won the race; read back the stored token.
    return (await this.cache.get(key)) ?? randomUUID();
  }

  /** Replaces the version token. Returns the new token. */
  async bump(namespace: readonly string[]): Promise<string> {
    const token = randomUUID();
    await this.cache.set(this.versionKey(namespace), token);
    return token;
  }

  /** Cache key for `params` under the namespace's current version token. */
  async key(namespace: readonly string[], params: unknown): Promise<string> {
    const token = await this.version(namespace);
    return `${this.prefix}:data:${encodeNamespace(namespace)}:v${token}:${stableDigest(params)}`;
  }

  private versionKey(namespace: readonly string[]): string {
    return `${this.prefix}:ver:${encodeNamespace(namespace)}`;
  }
}

/** Encodes each segment so that segments containing ':' cannot collide with other namespaces. */
function encodeNamespace(namespace: readonly string[]): string {
  return namespace.map((segment) => encodeURIComponent(segment)).join(':');
}
