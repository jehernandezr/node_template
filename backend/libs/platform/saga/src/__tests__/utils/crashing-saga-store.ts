import type { SagaInstance } from '../../model/saga-instance.js';
import type { DispatchWrite } from '../../store/dispatch-write.js';
import type { FencedWrite } from '../../store/fenced-write.js';
import { InMemorySagaStore } from './in-memory-saga-store.js';

/** Error thrown by a store that crashes in place of the process that died. */
export class ProcessDied extends Error {
  constructor(where: string) {
    super(`process died ${where}`);
    this.name = 'ProcessDied';
  }
}

/**
 * In-memory store that emulates the death of the process running a saga at a
 * chosen point. The run that "dies" receives a `ProcessDied` and, like a
 * dead process, never releases its lease: another node takes the saga only when the lease expires.
 */
export class CrashingSagaStore extends InMemorySagaStore {
  private afterDispatchOf: number | 'any' | undefined;
  private beforeOutcomeOf: number | undefined;
  private readonly deadTokens = new Set<string>();

  /** The next dispatch of step `index` (any by default) is written and then the process dies. */
  crashAfterDispatch(index: number | 'any' = 'any'): void {
    this.afterDispatchOf = index;
  }

  /**
   * The process dies just before writing the result of step `index`: the
   * call already applied its effect, but the log still says `dispatched`.
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
