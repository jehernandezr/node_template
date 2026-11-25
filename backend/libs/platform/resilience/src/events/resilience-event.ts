import type { ResilienceEventKind } from './resilience-event-kind.enum.js';

/** Primitive data that accompanies an event. Never includes the raw error. */
export interface ResilienceEventDetail {
  readonly attempt?: number;
  readonly delayMs?: number;
  readonly timeoutMs?: number;
  readonly errorName?: string;
  readonly errorCode?: string;
}

/** Event of a policy, meant for metrics and traces. */
export interface ResilienceEvent {
  readonly policy: string;
  /** Dependency whose breaker or bulkhead emitted the event. Defaults to the policy name. */
  readonly dependencyKey: string;
  readonly kind: ResilienceEventKind;
  /** Epoch milliseconds when the event occurred. */
  readonly at: number;
  readonly detail?: ResilienceEventDetail;
}

/** Receives each resilience event. */
export type ResilienceEventListener = (
  event: ResilienceEvent,
) => void | Promise<void>;
