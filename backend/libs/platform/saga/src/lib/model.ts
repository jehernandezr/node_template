/** Lifecycle of a saga instance. */
export enum SagaStatus {
  Running = 'running',
  Suspended = 'suspended',
  Compensating = 'compensating',
  Completed = 'completed',
  Compensated = 'compensated',
  CompensationFailed = 'compensation_failed',
  /** Needs a person: the saga cannot be completed or compensated automatically. */
  RequiresIntervention = 'requires_intervention',
}

/** Whether the saga is moving forward or undoing completed steps. */
export enum StepDirection {
  Forward = 'forward',
  Compensate = 'compensate',
}

/** Status of one attempt recorded in the step log. */
export enum StepStatus {
  /** Written before the call; the outcome is not known yet. */
  Dispatched = 'dispatched',
  Succeeded = 'succeeded',
  /** Definitive business error: the operation did not apply. */
  Failed = 'failed',
  /** Transient failure or protocol violation: the operation may have applied. */
  Uncertain = 'uncertain',
}

/** Persistent state of a saga. */
export interface SagaInstance {
  readonly id: string;
  readonly type: string;
  readonly idempotencyKey: string | null;
  readonly status: SagaStatus;
  readonly state: unknown;
  /** Index of the step being executed (forward) or compensated. */
  readonly currentStep: number;
  readonly direction: StepDirection;
  /** Optimistic concurrency version, bumped on every fenced write. */
  readonly version: number;
  /** Token of the run that holds the lease, or null. */
  readonly leaseToken: string | null;
  readonly leaseUntil: Date | null;
  readonly nextAttemptAt: Date | null;
  /** Consecutive failed attempts of the current step. */
  readonly attempts: number;
  /** When the current suspension period started. */
  readonly suspendedSince: Date | null;
  readonly deadlineAt: Date | null;
  readonly lastErrorCode: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Log entry of one step attempt in one direction. */
export interface StepLogEntry {
  readonly sagaId: string;
  readonly stepIndex: number;
  readonly operationId: string;
  readonly direction: StepDirection;
  readonly status: StepStatus;
  /** `${sagaId}:${stepIndex}:${direction}`, reused on every attempt. */
  readonly idempotencyKey: string;
  readonly input: unknown;
  readonly output: unknown;
  readonly errorCode: string | null;
  readonly startedAt: Date;
  readonly finishedAt: Date | null;
}

/** Source of the current time. */
export interface Clock {
  /** Returns the current instant. */
  now(): Date;
}

/** Clock backed by the system time. */
export const systemClock: Clock = {
  now: () => new Date(),
};

/** Builds the idempotency key of a step attempt. */
export function stepIdempotencyKey(
  sagaId: string,
  stepIndex: number,
  direction: StepDirection,
): string {
  return `${sagaId}:${stepIndex}:${direction}`;
}

/** Notable transitions published by the engine. */
export enum SagaEventKind {
  Completed = 'completed',
  Compensated = 'compensated',
  CompensationFailed = 'compensation_failed',
  RequiresIntervention = 'requires_intervention',
  Suspended = 'suspended',
  /** Alert: a callee broke the protocol; the step is treated as uncertain. */
  ProtocolViolation = 'protocol_violation',
}

/** Event emitted by the engine. */
export interface SagaEvent {
  readonly kind: SagaEventKind;
  readonly sagaId: string;
  readonly type: string;
  readonly lastErrorCode: string | null;
}

/** Listener of engine events. Errors it throws or rejects with are ignored. */
export type SagaEventListener = (event: SagaEvent) => void | Promise<void>;
