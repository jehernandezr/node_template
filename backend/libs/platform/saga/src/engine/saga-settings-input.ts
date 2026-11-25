/** Engine configuration values. Those not passed take their default value from `SagaSettings`. */
export interface SagaSettingsInput {
  /** Identity of this process. The lease tokens are derived from it. */
  readonly owner: string;
  /** Lease duration in milliseconds. Must exceed `maxStepDurationMs`. */
  readonly leaseMs?: number;
  /** Longest expected call to an operation, in milliseconds. */
  readonly maxStepDurationMs?: number;
  /** Failed attempts in suspension before requiring intervention. */
  readonly maxSuspendAttempts?: number;
  /** Time in suspension before requiring intervention, in milliseconds. */
  readonly maxSuspendAgeMs?: number;
  /** How long a finished saga is kept before `SagaRetentionJob` deletes it, in milliseconds. */
  readonly retentionMs?: number;
  /** Sagas that `SagaRecoveryJob` resumes per pass. */
  readonly recoveryBatchSize?: number;
}
