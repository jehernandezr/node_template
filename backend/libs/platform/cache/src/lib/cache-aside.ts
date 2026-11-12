import type { CachePort } from './cache-port.js';
import { jitteredTtl } from './jittered-ttl.js';
import { SingleFlight } from './single-flight.js';
import type { VersionedKeyspace } from './versioned-keyspace.js';

const DEFAULT_TIMEOUT_MS = 50;

/** Options for {@link CacheAside}. */
export interface CacheAsideOptions {
  /** Shared deduplicator for loads. A private instance is created when omitted. */
  singleFlight?: SingleFlight;
  /** Randomness for TTL jitter, in [0, 1). Defaults to `Math.random`. */
  random?: () => number;
  /** Called with cache failures that were absorbed by falling back to the loader. */
  onError?: (error: unknown) => void;
  /** Maximum wait for each cache call before it counts as a failure. Defaults to 50 ms. */
  timeoutMs?: number;
}

/**
 * Value wrapper stored in the cache. Storing `{ v }` instead of the bare value makes
 * `undefined` and `null` results cacheable and distinguishable from a miss.
 */
export interface CacheEnvelope<T> {
  v: T;
}

/** Options for {@link CacheAside.invalidate}. */
export interface InvalidateOptions {
  /**
   * Registers a callback that runs after the surrounding transaction commits.
   * Invalidation bumps the version immediately and again through this callback.
   * The second bump is needed because a reader outside the transaction can load the
   * old committed data between the first bump and the commit, then cache it under
   * the new version. The post-commit bump makes that entry unreachable.
   */
  afterCommit?: (fn: () => Promise<void>) => void;
}

/** Arguments for {@link CacheAside.getOrLoad}. */
export interface GetOrLoadOptions<T> {
  /** Namespace used for versioning and invalidation, e.g. `['tenant', 't1', 'orders']`. */
  namespace: readonly string[];
  /** Query parameters that identify the cached result. */
  params: unknown;
  /** Base TTL in milliseconds; the stored TTL is jittered around it. */
  ttlMs: number;
  /** Loads the authoritative value, normally from the database. */
  load: () => Promise<T>;
  /** When true, bypass the cache and call `load` directly, e.g. inside a transaction. */
  inTransaction?: boolean;
  /** Converts the `{ v }` envelope to a string. Defaults to `JSON.stringify`. */
  serialize?: (envelope: CacheEnvelope<T>) => string;
  /** Converts a stored string back to the `{ v }` envelope. Defaults to `JSON.parse`. */
  deserialize?: (raw: string) => CacheEnvelope<T>;
}

/** What the single-flight leader produces. Waiters decode `raw` themselves so each gets its own copy. */
type FlightOutcome<T> =
  { kind: 'raw'; raw: string } | { kind: 'value'; value: T };

/** Cache-aside reads with versioned keys, jittered TTLs and single-flight loads. */
export class CacheAside {
  private readonly singleFlight: SingleFlight;
  private readonly random: () => number;
  private readonly onError: (error: unknown) => void;
  private readonly timeoutMs: number;

  constructor(
    private readonly cache: CachePort,
    private readonly keyspace: VersionedKeyspace,
    options: CacheAsideOptions = {},
  ) {
    this.singleFlight = options.singleFlight ?? new SingleFlight();
    this.random = options.random ?? Math.random;
    this.onError = options.onError ?? ((): void => undefined);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Returns the cached value for the query, or loads it and stores it in the background.
   * Cache failures and timeouts fall back to `load` and are reported through `onError`.
   * Errors thrown by `load` propagate to every concurrent caller of the same key.
   */
  async getOrLoad<T>(options: GetOrLoadOptions<T>): Promise<T> {
    const { namespace, params, ttlMs, load, inTransaction = false } = options;
    if (inTransaction) {
      return load();
    }
    const serialize =
      options.serialize ??
      ((envelope: CacheEnvelope<T>): string => JSON.stringify(envelope));
    const deserialize =
      options.deserialize ??
      ((raw: string): CacheEnvelope<T> => JSON.parse(raw) as CacheEnvelope<T>);

    let key: string;
    try {
      key = await this.timed(this.keyspace.key(namespace, params));
    } catch (error) {
      this.report(error);
      return load();
    }

    const outcome = await this.singleFlight.run(key, () =>
      this.fetchOrLoad(key, ttlMs, load, serialize),
    );
    if (outcome.kind === 'value') {
      return outcome.value;
    }
    try {
      const envelope = deserialize(outcome.raw);
      if (typeof envelope !== 'object' || envelope === null) {
        throw new TypeError('cached entry is not an envelope');
      }
      return envelope.v;
    } catch (error) {
      this.report(error);
      return load();
    }
  }

  /**
   * Makes every cached result under the namespace unreachable by bumping its version.
   * Never throws: failures are reported through `onError`, so a dead cache does not fail the write.
   * See {@link InvalidateOptions.afterCommit} for the post-commit bump.
   */
  async invalidate(
    namespace: readonly string[],
    options: InvalidateOptions = {},
  ): Promise<void> {
    await this.bumpSafely(namespace);
    try {
      options.afterCommit?.(() => this.bumpSafely(namespace));
    } catch (error) {
      this.report(error);
    }
  }

  /** Leader path of the single-flight: read the cache, otherwise load and store in the background. */
  private async fetchOrLoad<T>(
    key: string,
    ttlMs: number,
    load: () => Promise<T>,
    serialize: (envelope: CacheEnvelope<T>) => string,
  ): Promise<FlightOutcome<T>> {
    const cached = await this.readRaw(key);
    if (cached !== undefined) {
      return { kind: 'raw', raw: cached };
    }
    const value = await load();
    let raw: string;
    try {
      raw = serialize({ v: value });
    } catch (error) {
      this.report(error);
      return { kind: 'value', value };
    }
    // Fire-and-forget: the caller does not wait for the write. store() never rejects.
    void this.store(key, raw, ttlMs);
    return { kind: 'raw', raw };
  }

  private async readRaw(key: string): Promise<string | undefined> {
    try {
      return await this.timed(this.cache.get(key));
    } catch (error) {
      this.report(error);
      return undefined;
    }
  }

  private async store(key: string, raw: string, ttlMs: number): Promise<void> {
    try {
      const ttl = jitteredTtl(ttlMs, { random: this.random });
      await this.timed(this.cache.set(key, raw, ttl));
    } catch (error) {
      this.report(error);
    }
  }

  private async bumpSafely(namespace: readonly string[]): Promise<void> {
    try {
      await this.timed(this.keyspace.bump(namespace));
    } catch (error) {
      this.report(error);
    }
  }

  /** Races an operation against the configured timeout. The timer is cleared once the race settles. */
  private timed<T>(operation: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`cache operation exceeded ${this.timeoutMs} ms`));
      }, this.timeoutMs);
    });
    return Promise.race([operation, timeout]).finally(() =>
      clearTimeout(timer),
    );
  }

  private report(error: unknown): void {
    this.onError(error);
  }
}
