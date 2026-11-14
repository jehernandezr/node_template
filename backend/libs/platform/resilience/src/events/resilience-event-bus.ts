import type { Clock } from '@platform/kernel';
import type { ResilienceEventKind } from './resilience-event-kind.enum.js';
import type {
  ResilienceEvent,
  ResilienceEventDetail,
  ResilienceEventListener,
} from './resilience-event.js';

/**
 * Reparte los eventos de las políticas a sus suscriptores. Un suscriptor que
 * falla no rompe la llamada protegida: sus errores síncronos y asíncronos se
 * descartan, porque la métrica no debe cambiar el resultado de negocio.
 */
export class ResilienceEventBus {
  private readonly listeners = new Set<ResilienceEventListener>();

  constructor(private readonly clock: Clock) {}

  /** @returns función que quita al suscriptor. */
  subscribe(listener: ResilienceEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(
    policy: string,
    dependencyKey: string,
    kind: ResilienceEventKind,
    detail?: ResilienceEventDetail,
  ): void {
    const event: ResilienceEvent = {
      policy,
      dependencyKey,
      kind,
      at: this.clock.now().getTime(),
      detail,
    };
    for (const listener of this.listeners) {
      try {
        void Promise.resolve(listener(event)).catch(() => undefined);
      } catch {
        // Un suscriptor que falla no debe romper la llamada protegida.
      }
    }
  }
}
