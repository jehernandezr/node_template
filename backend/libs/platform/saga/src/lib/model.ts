import { SystemClock, type Clock } from '@platform/kernel';

export type { Clock } from '@platform/kernel';

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
  /** Transient failure, unknown outcome or protocol violation: the operation may have applied. */
  Uncertain = 'uncertain',
}

/**
 * Context of the calls a saga makes, persisted with the instance. Every
 * attempt of every step, including those of a recovered run, sends the same
 * values, so the callee scopes idempotency keys identically.
 */
export interface SagaCallContext {
  readonly tenantId?: string;
  readonly actorId?: string;
  readonly traceparent?: string;
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
  /** Call context of every step (tenant, actor, traceparent). Absent on instances from older versions. */
  readonly context?: SagaCallContext | null;
  /**
   * `stableDigest` of the initial state. An idempotent start with the same key
   * and another input is rejected. Absent on instances from older versions.
   */
  readonly inputDigest?: string | null;
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
  /**
   * W3C traceparent of the step, written with its dispatch. A retry of the
   * step, also from another node after a crash, runs in that trace. Absent on
   * entries from older versions.
   */
  readonly traceparent?: string | null;
  readonly startedAt: Date;
  readonly finishedAt: Date | null;
}

/**
 * Clock backed by the system time.
 * @deprecated Use `SystemClock` from `@platform/kernel`.
 */
export const systemClock: Clock = new SystemClock();

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
