import type {
  ResilienceEventKind,
  ResiliencePolicyName,
} from './policy-name.js';

/** Primitive data attached to an event. Never contains the raw error object. */
export interface ResilienceEventDetail {
  readonly attempt?: number;
  readonly delayMs?: number;
  readonly timeoutMs?: number;
  readonly errorName?: string;
  readonly errorCode?: string;
}

/** Event emitted by a resilience policy, intended for metrics and tracing. */
export interface ResilienceEvent {
  readonly policy: ResiliencePolicyName;
  /** Dependency whose breaker or bulkhead emitted the event (defaults to the policy name). */
  readonly dependencyKey: string;
  readonly kind: ResilienceEventKind;
  /** Epoch milliseconds when the event happened. */
  readonly at: number;
  readonly detail?: ResilienceEventDetail;
}

/** Receives every resilience event. */
export type ResilienceEventListener = (
  event: ResilienceEvent,
) => void | Promise<void>;
