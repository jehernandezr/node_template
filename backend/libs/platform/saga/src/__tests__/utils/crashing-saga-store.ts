import type { SagaInstance } from '../../model/saga-instance.js';
import type { DispatchWrite } from '../../store/dispatch-write.js';
import type { FencedWrite } from '../../store/fenced-write.js';
import { InMemorySagaStore } from './in-memory-saga-store.js';

/** Error que lanza un almacén que se cae en lugar del proceso que murió. */
export class ProcessDied extends Error {
  constructor(where: string) {
    super(`process died ${where}`);
    this.name = 'ProcessDied';
  }
}

/**
 * Almacén en memoria que emula la muerte del proceso que corre una saga en un
 * punto elegido. La corrida que "muere" recibe un `ProcessDied` y, como un
 * proceso muerto, nunca suelta su lease: otro nodo toma la saga solo cuando el lease vence.
 */
export class CrashingSagaStore extends InMemorySagaStore {
  private afterDispatchOf: number | 'any' | undefined;
  private beforeOutcomeOf: number | undefined;
  private readonly deadTokens = new Set<string>();

  /** El siguiente despacho del paso `index` (cualquiera por defecto) se escribe y luego el proceso muere. */
  crashAfterDispatch(index: number | 'any' = 'any'): void {
    this.afterDispatchOf = index;
  }

  /**
   * El proceso muere justo antes de escribir el resultado del paso `index`: la
   * llamada ya aplicó su efecto, pero la bitácora aún dice `dispatched`.
   */
  crashBeforeOutcome(index: number): void {
    this.beforeOutcomeOf = index;
  }

  override async dispatchStep(write: DispatchWrite): Promise<SagaInstance> {
    const saved = await super.dispatchStep(write);
    const target = this.afterDispatchOf;
    if (target === 'any' || target === write.step.stepIndex) {
      this.afterDispatchOf = undefined;
      this.die(
        write.leaseToken,
        `after dispatch of step ${write.step.stepIndex}`,
      );
    }
    return saved;
  }

  override async commitStep(write: FencedWrite): Promise<SagaInstance> {
    if (
      write.step !== undefined &&
      write.step.stepIndex === this.beforeOutcomeOf
    ) {
      this.beforeOutcomeOf = undefined;
      this.die(
        write.leaseToken,
        `before the outcome of step ${write.step.stepIndex}`,
      );
    }
    return super.commitStep(write);
  }

  override async releaseLease(id: string, token: string): Promise<void> {
    if (this.deadTokens.has(token)) {
      return;
    }
    return super.releaseLease(id, token);
  }

  private die(token: string, where: string): never {
    this.deadTokens.add(token);
    throw new ProcessDied(where);
  }
}
