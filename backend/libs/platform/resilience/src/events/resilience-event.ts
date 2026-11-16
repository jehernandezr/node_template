import type { ResilienceEventKind } from './resilience-event-kind.enum.js';

/** Datos primitivos que acompañan a un evento. Nunca incluye el error crudo. */
export interface ResilienceEventDetail {
  readonly attempt?: number;
  readonly delayMs?: number;
  readonly timeoutMs?: number;
  readonly errorName?: string;
  readonly errorCode?: string;
}

/** Evento de una política, pensado para métricas y trazas. */
export interface ResilienceEvent {
  readonly policy: string;
  /** Dependencia cuyo breaker o bulkhead emitió el evento. Por defecto, el nombre de la política. */
  readonly dependencyKey: string;
  readonly kind: ResilienceEventKind;
  /** Milisegundos epoch en que ocurrió el evento. */
  readonly at: number;
  readonly detail?: ResilienceEventDetail;
}

/** Recibe cada evento de resiliencia. */
export type ResilienceEventListener = (
  event: ResilienceEvent,
) => void | Promise<void>;
