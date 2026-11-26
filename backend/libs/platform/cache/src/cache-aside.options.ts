import type { TransactionManager } from '@platform/kernel';
import type { Deadline } from '@platform/primitives';
import type { ResilienceRegistry } from '@platform/resilience';
import type { CacheErrorReporter } from './cache-error-reporter.js';
import type { CallerWait } from './caller-wait.js';
import type { SingleFlight } from './single-flight.js';
import type { TtlJitter } from './ttl-jitter.js';

/**
 * What `CacheAside` needs from `@platform/resilience`: running a call
 * under a named policy. A `ResilienceRegistry` satisfies it.
 */
export type CacheResilience = Pick<ResilienceRegistry, 'execute'>;

/**
 * What `CacheAside` needs from the transaction manager: knowing whether the call
 * runs inside a transaction and registering an effect for after the
 * commit. The kernel's `TransactionManager` satisfies it. `afterCommit` is
 * optional to accept scopes that only know whether there is a transaction; without it, the
 * invalidation is not repeated after the commit.
 */
export type CacheTransactions = Pick<TransactionManager, 'isInTransaction'> &
  Partial<Pick<TransactionManager, 'afterCommit'>>;

/** Options of `CacheAside`. */
export interface CacheAsideOptions {
  /**
   * Runs each cache call under the `PolicyName.Cache` policy (per-attempt
   * deadline, total budget and circuit). Pass the application's shared `ResilienceRegistry`,
   * so caches on the same Valkey share a circuit.
   */
  readonly resilience: CacheResilience;
  /**
   * Key of the circuit and of the isolation bulkhead within the policy,
   * for example one per Valkey cluster. Defaults to the policy name.
   */
  readonly dependencyKey?: string;
}

/** Collaborators of `CacheAside`, all required and built by the caller. */
export interface CacheAsideCollaborators {
  /** Shared load deduplicator. */
  readonly singleFlight: SingleFlight;
  /** Random spread of the TTL. */
  readonly jitter: TtlJitter;
  /** Wait of each caller. */
  readonly wait: CallerWait;
  /**
   * Inside a transaction the cache is skipped and `load` runs directly: the
   * transaction may see uncommitted rows that must not reach other
   * readers, and a cached value would hide its own writes. `NoTransactionScope`
   * keeps the cache always active.
   */
  readonly transactions: CacheTransactions;
  /** Receives the failures absorbed by loading directly. `NoopCacheErrorReporter` discards them. */
  readonly reporter: CacheErrorReporter;
}

/**
 * Value wrapped in the cache. Storing `{ v }` instead of the value makes
 * `undefined` and `null` results cacheable, and distinguishes them from a failure.
 */
export interface CacheEnvelope<T> {
  v: T;
}

/** Arguments of `CacheAside.getOrLoad`. */
export interface GetOrLoadOptions<T> {
  /** Namespace for the version and invalidation, for example `['tenant', 't1', 'orders']`. */
  readonly namespace: readonly string[];
  /** Query parameters that identify the result. Must be canonical JSON. */
  readonly params: unknown;
  /** Base TTL in milliseconds. The stored TTL is spread around it. */
  readonly ttlMs: number;
  /** Loads the authoritative value, usually from the database. */
  readonly load: () => Promise<T>;
  /** Converts the `{ v }` envelope to text. Defaults to `JSON.stringify`. */
  readonly serialize?: (envelope: CacheEnvelope<T>) => string;
  /** Converts the stored text back into the `{ v }` envelope. Defaults to `JSON.parse`. */
  readonly deserialize?: (raw: string) => CacheEnvelope<T>;
  /** The caller stops waiting and rejects with the signal's reason. The shared load continues for the others. */
  readonly signal?: AbortSignal;
  /** The caller stops waiting and rejects with `DeadlineExceededError`. The shared load continues for the others. */
  readonly deadline?: Deadline;
}
