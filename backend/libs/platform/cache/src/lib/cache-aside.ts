import type { Deadline } from '@platform/primitives';
import { ResiliencePolicyName, ResilienceRegistry } from '@platform/resilience';
import type { CachePort } from './cache-port.js';
import {
  CacheCorruptEntryError,
  CacheInvalidArgumentError,
  CacheValueTooLargeError,
} from './errors.js';
import { jitteredTtl } from './jittered-ttl.js';
import { SingleFlight } from './single-flight.js';
import type { VersionedKeyspace } from './versioned-keyspace.js';
import { cancellation, waitFor, type WaitOptions } from './wait.js';

/** Default bound for a serialized entry, in UTF-8 bytes (512 KiB). */
export const DEFAULT_MAX_CACHE_VALUE_BYTES = 512 * 1024;

/**
 * What {@link CacheAside} needs from `@platform/resilience`: running a call
 * under a named policy. A `ResilienceRegistry` satisfies it.
 */
export type CacheResilience = Pick<ResilienceRegistry, 'execute'>;

/** Options for {@link CacheAside}. */
export interface CacheAsideOptions {
  /** Shared deduplicator for loads. A private instance is created when omitted. */
  singleFlight?: SingleFlight;
  /** Randomness for TTL jitter, in [0, 1). Defaults to `Math.random`. */
  random?: () => number;
  /** Called with cache failures that were absorbed by falling back to the loader. */
  onError?: (error: unknown) => void;
  /**
   * Runs every cache call under `ResiliencePolicyName.Cache` (attempt timeout,
   * total budget and circuit breaker). Pass the application's shared
   * `ResilienceRegistry` so all caches of one Valkey share a breaker and its
   * events. Defaults to a private registry with the default policies, so the
   * timeout is `defaultPolicies[ResiliencePolicyName.Cache].timeoutMs`.
   */
  resilience?: CacheResilience;
  /**
   * Breaker and bulkhead key inside the cache policy, for example one per
   * Valkey cluster. Defaults to the policy name.
   */
  dependencyKey?: string;
  /**
   * Largest serialized entry that is stored, in UTF-8 bytes. Larger values are
   * returned but not cached, and reported as `CacheValueTooLargeError`.
   * Defaults to {@link DEFAULT_MAX_CACHE_VALUE_BYTES}.
   */
  maxValueBytes?: number;
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
  /**
   * This caller stops waiting and rejects with the signal's reason when it
   * aborts. A shared load keeps running for the other callers of the same key.
   */
  signal?: AbortSignal;
  /**
   * This caller stops waiting and rejects with `DeadlineExceededError` when it
   * expires. A shared load keeps running for the other callers of the same key.
   */
  deadline?: Deadline;
}

/** What the single-flight leader produces. Waiters decode `raw` themselves so each gets its own copy. */
type FlightOutcome<T> =
  { kind: 'raw'; raw: string } | { kind: 'value'; value: T };

/** Cache-aside reads with versioned keys, jittered TTLs and single-flight loads. */
export class CacheAside {
  private readonly singleFlight: SingleFlight;
  private readonly random: () => number;
  private readonly onError: (error: unknown) => void;
  private readonly resilience: CacheResilience;
  private readonly dependencyKey: string | undefined;
  private readonly maxValueBytes: number;

  constructor(
    private readonly cache: CachePort,
    private readonly keyspace: VersionedKeyspace,
    options: CacheAsideOptions = {},
  ) {
    this.singleFlight = options.singleFlight ?? new SingleFlight();
    this.random = options.random ?? Math.random;
    this.onError = options.onError ?? ((): void => undefined);
    this.resilience = options.resilience ?? new ResilienceRegistry();
    this.dependencyKey = options.dependencyKey;
    this.maxValueBytes = options.maxValueBytes ?? DEFAULT_MAX_CACHE_VALUE_BYTES;
    if (!Number.isInteger(this.maxValueBytes) || this.maxValueBytes < 1) {
      throw new CacheInvalidArgumentError('maxValueBytes', 'an integer >= 1');
    }
  }

  /**
   * Returns the cached value for the query, or loads it and stores it in the background.
   * Cache failures, timeouts and an open circuit fall back to `load` and are
   * reported through `onError`.
   * Errors thrown by `load` propagate to every concurrent caller of the same key.
   * The caller's `signal` and `deadline` only bound its own wait.
   */
  async getOrLoad<T>(options: GetOrLoadOptions<T>): Promise<T> {
    const { namespace, params, ttlMs, load, inTransaction = false } = options;
    const wait: WaitOptions = {
      signal: options.signal,
      deadline: options.deadline,
    };
    const cancelled = cancellation(wait);
    if (cancelled !== undefined) {
      throw cancelled;
    }
    if (inTransaction) {
      return waitFor(load(), wait);
    }
    const serialize =
      options.serialize ??
      ((envelope: CacheEnvelope<T>): string => JSON.stringify(envelope));
    const deserialize =
      options.deserialize ??
      ((raw: string): CacheEnvelope<T> => JSON.parse(raw) as CacheEnvelope<T>);

    let key: string;
    try {
      key = await waitFor(
        this.guarded(() => this.keyspace.key(namespace, params)),
        wait,
      );
    } catch (error) {
      return this.fallback(error, load, wait);
    }

    const outcome = await this.singleFlight.run(
      key,
      () => this.fetchOrLoad(key, ttlMs, load, serialize),
      wait,
    );
    if (outcome.kind === 'value') {
      return outcome.value;
    }
    try {
      const envelope = deserialize(outcome.raw);
      if (typeof envelope !== 'object' || envelope === null) {
        throw new CacheCorruptEntryError('not an envelope');
      }
      return envelope.v;
    } catch (error) {
      return this.fallback(error, load, wait);
    }
  }

  /**
   * Absorbs a cache failure by loading directly, unless the caller already gave
   * up: then it rejects with the cancellation instead of starting a load.
   */
  private fallback<T>(
    error: unknown,
    load: () => Promise<T>,
    wait: WaitOptions,
  ): Promise<T> {
    const cancelled = cancellation(wait);
    if (cancelled !== undefined) {
      return Promise.reject(cancelled);
    }
    this.report(error);
    return waitFor(load(), wait);
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
    const bytes = Buffer.byteLength(raw, 'utf8');
    if (bytes > this.maxValueBytes) {
      // Serve it, but never write an oversized entry to the shared cache.
      this.report(new CacheValueTooLargeError(bytes, this.maxValueBytes));
      return { kind: 'raw', raw };
    }
    // Fire-and-forget: the caller does not wait for the write. store() never rejects.
    void this.store(key, raw, ttlMs);
    return { kind: 'raw', raw };
  }

  private async readRaw(key: string): Promise<string | undefined> {
    try {
      return await this.guarded(() => this.cache.get(key));
    } catch (error) {
      this.report(error);
      return undefined;
    }
  }

  private async store(key: string, raw: string, ttlMs: number): Promise<void> {
    try {
      const ttl = jitteredTtl(ttlMs, { random: this.random });
      await this.guarded(() => this.cache.set(key, raw, ttl));
    } catch (error) {
      this.report(error);
    }
  }

  private async bumpSafely(namespace: readonly string[]): Promise<void> {
    try {
      await this.guarded(() => this.keyspace.bump(namespace));
    } catch (error) {
      this.report(error);
    }
  }

  /**
   * Runs one cache call under `ResiliencePolicyName.Cache`. The policy owns the
   * timeout and the breaker: with Valkey down, the breaker opens after a few
   * failures and later calls fail at once with `CircuitOpenError`.
   */
  private guarded<T>(operation: () => Promise<T>): Promise<T> {
    return this.resilience.execute(ResiliencePolicyName.Cache, operation, {
      dependencyKey: this.dependencyKey,
    });
  }

  private report(error: unknown): void {
    this.onError(error);
  }
}
