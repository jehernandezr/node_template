import type { RandomSource } from '@platform/kernel';
import { Backoff, BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { SagaError } from '../errors/saga-error.js';
import { SagaErrorCode } from '../errors/saga-error-code.enum.js';
import type { SuspendPolicy } from '../model/suspend-policy.js';
import type { SagaSettingsInput } from './saga-settings-input.js';

const DAY_MS = 86_400_000;

/**
 * Engine configuration with its defaults. The wait between
 * retries is exponential with equal jitter: after an outage, sagas
 * suspended at the same time do not retry at the same instants, and each wait
 * keeps at least half of the exponential.
 */
export class SagaSettings {
  static readonly DEFAULT_LEASE_MS = 30_000;
  static readonly DEFAULT_MAX_STEP_MS = 25_000;
  static readonly DEFAULT_MAX_SUSPEND_ATTEMPTS = 20;
  static readonly DEFAULT_MAX_SUSPEND_AGE_MS = DAY_MS;
  static readonly DEFAULT_RETENTION_MS = 30 * DAY_MS;
  static readonly DEFAULT_RECOVERY_BATCH_SIZE = 50;
  static readonly BACKOFF = new RetryPolicy(
    Backoff.MAX_ATTEMPT,
    1_000,
    60_000,
    BackoffStrategy.EqualJitter,
  );

  readonly owner: string;
  readonly leaseMs: number;
  readonly maxStepDurationMs: number;
  readonly maxSuspendAttempts: number;
  readonly maxSuspendAgeMs: number;
  readonly retentionMs: number;
  readonly recoveryBatchSize: number;

  private readonly backoff: Backoff;

  /**
   * @throws SagaError `InvalidConfiguration` if the lease does not exceed the time
   *   of a step: another node could take the saga in the middle of a call.
   */
  constructor(input: SagaSettingsInput, random: RandomSource) {
    this.owner = input.owner;
    this.leaseMs = input.leaseMs ?? SagaSettings.DEFAULT_LEASE_MS;
    this.maxStepDurationMs =
      input.maxStepDurationMs ?? SagaSettings.DEFAULT_MAX_STEP_MS;
    this.maxSuspendAttempts =
      input.maxSuspendAttempts ?? SagaSettings.DEFAULT_MAX_SUSPEND_ATTEMPTS;
    this.maxSuspendAgeMs =
      input.maxSuspendAgeMs ?? SagaSettings.DEFAULT_MAX_SUSPEND_AGE_MS;
    this.retentionMs = input.retentionMs ?? SagaSettings.DEFAULT_RETENTION_MS;
    this.recoveryBatchSize =
      input.recoveryBatchSize ?? SagaSettings.DEFAULT_RECOVERY_BATCH_SIZE;
    this.backoff = new Backoff(SagaSettings.BACKOFF, random);
    if (this.leaseMs <= this.maxStepDurationMs) {
      throw new SagaError(
        SagaErrorCode.InvalidConfiguration,
        `leaseMs (${this.leaseMs}) must be greater than maxStepDurationMs (${this.maxStepDurationMs})`,
      );
    }
  }

  /**
   * Caps and wait of a step's suspension.
   * @returns The suspend policy.
   */
  suspendPolicy(): SuspendPolicy {
    return {
      maxSuspendAttempts: this.maxSuspendAttempts,
      maxSuspendAgeMs: this.maxSuspendAgeMs,
      backoff: (attempt) =>
        this.backoff.delay(Math.min(attempt, Backoff.MAX_ATTEMPT)),
    };
  }
}
