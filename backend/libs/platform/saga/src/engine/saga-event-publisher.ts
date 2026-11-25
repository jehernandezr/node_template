import type { LoggerPort } from '@platform/observability';
import type { SagaEvent } from '../model/saga-event.js';
import type { SagaEventKind } from '../model/saga-event-kind.enum.js';
import type { SagaEventListener } from '../model/saga-event.js';
import type { SagaInstance } from '../model/saga-instance.js';

/**
 * Emits the engine's events in process. They go out after the transition is
 * committed and are best effort: a process that dies after committing, or
 * a listener added later, does not receive them. Durable delivery requires an
 * outbox with the event rows in the same commit.
 */
export class SagaEventPublisher {
  private readonly listeners = new Set<SagaEventListener>();

  constructor(private readonly logger?: LoggerPort) {}

  /** Subscribes a listener. Returns the function that removes it. */
  subscribe(listener: SagaEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** A listener failure never affects the saga: it is only logged. */
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
