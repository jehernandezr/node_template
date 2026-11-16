import type { LoggerPort } from '@platform/observability';
import type { SagaEvent } from '../model/saga-event.js';
import type { SagaEventKind } from '../model/saga-event-kind.enum.js';
import type { SagaEventListener } from '../model/saga-event.js';
import type { SagaInstance } from '../model/saga-instance.js';

/**
 * Emite en proceso los eventos del motor. Salen después de confirmada la
 * transición y son de mejor esfuerzo: un proceso que muere tras confirmar, o
 * un oyente agregado después, no los recibe. Una entrega durable pide un
 * outbox con las filas del evento en la misma confirmación.
 */
export class SagaEventPublisher {
  private readonly listeners = new Set<SagaEventListener>();

  constructor(private readonly logger?: LoggerPort) {}

  /** Suscribe un oyente. Devuelve la función que lo retira. */
  subscribe(listener: SagaEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Un fallo de un oyente nunca afecta a la saga: solo se registra. */
  publish(kind: SagaEventKind, instance: SagaInstance): void {
    const event: SagaEvent = {
      kind,
      sagaId: instance.id,
      type: instance.type,
      lastErrorCode: instance.lastErrorCode,
    };
    const report = (error: unknown): void => {
      this.logger?.warn('saga event listener failed', {
        sagaId: instance.id,
        kind,
        error,
      });
    };
    for (const listener of [...this.listeners]) {
      try {
        void Promise.resolve(listener(event)).catch(report);
      } catch (error) {
        report(error);
      }
    }
  }
}
