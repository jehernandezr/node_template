import { PolicyName } from '@platform/resilience';
import type { CachePort } from './cache-port.js';
import { CallerWait } from './caller-wait.js';
import { FlightOutcomeKind } from './flight-outcome-kind.enum.js';
import type { CallerWaitOptions } from './caller-wait.options.js';
import type { CacheErrorReporter } from './cache-error-reporter.js';
import { CacheCorruptEntryError } from './errors/cache-corrupt-entry.error.js';
import { CacheValueTooLargeError } from './errors/cache-value-too-large.error.js';
import { SingleFlight } from './single-flight.js';
import { TtlJitter } from './ttl-jitter.js';
import type {
  CacheAsideCollaborators,
  CacheAsideOptions,
  CacheEnvelope,
  CacheResilience,
  CacheTransactions,
  GetOrLoadOptions,
} from './cache-aside.options.js';
import type { VersionedKeyspace } from './versioned-keyspace.js';

/** What the leader of a shared flight delivers: the raw text or the already loaded value. */
type FlightOutcome<T> =
  | { readonly kind: FlightOutcomeKind.Raw; readonly raw: string }
  | { readonly kind: FlightOutcomeKind.Value; readonly value: T };

/**
 * Cache reads with versioned keys, spread TTL and deduplicated loads.
 * Cache failures, timeouts and an open circuit fall back to a
 * direct load and are reported; an error from `load` reaches every caller
 * waiting on that key.
 */
export class CacheAside {
  /** Maximum size of a serialized entry, in UTF-8 bytes (512 KiB). */
  static readonly MAX_VALUE_BYTES = 512 * 1024;

  private readonly wait: CallerWait;
  private readonly singleFlight: SingleFlight;
  private readonly jitter: TtlJitter;
  private readonly transactions: CacheTransactions;
  private readonly reporter: CacheErrorReporter;
  private readonly resilience: CacheResilience;
  private readonly dependencyKey: string | undefined;

  constructor(
    private readonly cache: CachePort,
    private readonly keyspace: VersionedKeyspace,
    options: CacheAsideOptions,
    collaborators: CacheAsideCollaborators,
  ) {
    this.wait = collaborators.wait;
    this.singleFlight = collaborators.singleFlight;
    this.jitter = collaborators.jitter;
    this.transactions = collaborators.transactions;
    this.reporter = collaborators.reporter;
    this.resilience = options.resilience;
    this.dependencyKey = options.dependencyKey;
  }

  /**
   * Returns the cached value of the query or loads it and stores it in the
   * background. Cache failures fall back to `load` and are reported.
   * Errors from `load` reach all concurrent callers of the key.
   * The caller's signal and deadline only bound its own wait.
   */
  async getOrLoad<T>(options: GetOrLoadOptions<T>): Promise<T> {
    const { namespace, params, ttlMs, load } = options;
    const wait: CallerWaitOptions = {
      signal: options.signal,
      deadline: options.deadline,
    };
    const cancelled = this.wait.cancellation(wait);
    if (cancelled !== undefined) {
      throw cancelled;
    }
    if (this.transactions.isInTransaction()) {
      return this.wait.wait(load(), wait);
    }
    const serialize =
      options.serialize ??
      ((envelope: CacheEnvelope<T>): string => JSON.stringify(envelope));
    const deserialize =
      options.deserialize ??
      ((raw: string): CacheEnvelope<T> => JSON.parse(raw) as CacheEnvelope<T>);

    let key: string;
    try {
      key = await this.wait.wait(
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
    if (outcome.kind === FlightOutcomeKind.Value) {
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
   * Absorbs a cache failure by loading directly, unless the caller has already
   * given up: then it rejects with its cancellation and does not start the load.
   */
  private fallback<T>(
    error: unknown,
    load: () => Promise<T>,
    wait: CallerWaitOptions,
  ): Promise<T> {
    const cancelled = this.wait.cancellation(wait);
    if (cancelled !== undefined) {
      return Promise.reject(cancelled);
    }
    this.reporter.report(error);
    return this.wait.wait(load(), wait);
  }

  /**
   * Makes the cached results of the namespace unreachable by changing
   * its version. Never throws: failures are reported, so a cache that is
   * down does not make the write fail.
   *
   * Inside a transaction the change is repeated after the commit. A reader
   * outside the transaction may load the old data between the first change and
   * the commit and store it under the new version; the later change makes
   * that entry unreachable. If the transaction rolls back, there is no later change.
   */
  async invalidate(namespace: readonly string[]): Promise<void> {
    await this.bumpSafely(namespace);
    if (!this.transactions.isInTransaction()) {
      return;
    }
    try {
      this.transactions.afterCommit?.(() => this.bumpSafely(namespace));
    } catch (error) {
      this.reporter.report(error);
    }
  }

  /** Flight leader path: reads the cache and, if missing, loads and stores in the background. */
  private async fetchOrLoad<T>(
    key: string,
    ttlMs: number,
    load: () => Promise<T>,
    serialize: (envelope: CacheEnvelope<T>) => string,
  ): Promise<FlightOutcome<T>> {
    const cached = await this.readRaw(key);
    if (cached !== undefined) {
      return { kind: FlightOutcomeKind.Raw, raw: cached };
    }
    const value = await load();
    let raw: string;
    try {
      raw = serialize({ v: value });
    } catch (error) {
      this.reporter.report(error);
      return { kind: FlightOutcomeKind.Value, value };
    }
    const bytes = Buffer.byteLength(raw, 'utf8');
    if (bytes > CacheAside.MAX_VALUE_BYTES) {
      // It is served, but a huge entry is never written to the shared cache.
      this.reporter.report(
        new CacheValueTooLargeError(bytes, CacheAside.MAX_VALUE_BYTES),
      );
      return { kind: FlightOutcomeKind.Raw, raw };
    }
    // Background write: the caller does not wait. `store` never rejects.
    void this.store(key, raw, ttlMs);
    return { kind: FlightOutcomeKind.Raw, raw };
  }

  private async readRaw(key: string): Promise<string | undefined> {
    try {
      return await this.guarded(() => this.cache.get(key));
    } catch (error) {
      this.reporter.report(error);
      return undefined;
    }
  }

  private async store(key: string, raw: string, ttlMs: number): Promise<void> {
    try {
      const ttl = this.jitter.jitter(ttlMs);
      await this.guarded(() => this.cache.set(key, raw, ttl));
    } catch (error) {
      this.reporter.report(error);
    }
  }

  private async bumpSafely(namespace: readonly string[]): Promise<void> {
    try {
      await this.guarded(() => this.keyspace.bump(namespace));
    } catch (error) {
      this.reporter.report(error);
    }
  }

  /**
   * Runs a cache call under `PolicyName.Cache`. The policy controls the
   * deadline and the circuit: with Valkey down, after a few failures the circuit opens
   * and the following calls fail immediately with `CircuitOpenError`.
   */
  private guarded<T>(operation: () => Promise<T>): Promise<T> {
    return this.resilience.execute(PolicyName.Cache, operation, {
      dependencyKey: this.dependencyKey,
    });
  }
}
