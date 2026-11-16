import type { SagaInstance } from '../../model.js';
import { InMemorySagaStore } from '../../store/in-memory-saga-store.js';
import type { DispatchWrite, FencedWrite } from '../../store/saga-store.js';

/** Error a crashing store throws in place of the process that died. */
export class ProcessDied extends Error {
  constructor(where: string) {
    super(`process died ${where}`);
    this.name = 'ProcessDied';
  }
}

/**
 * In-memory store that emulates the death of the process running a saga at a
 * chosen point. The run that "dies" gets a `ProcessDied` error and, like a
 * dead process, never releases its lease: another node takes the saga only
 * once the lease expires.
 */
export class CrashingSagaStore extends InMemorySagaStore {
  private afterDispatchOf: number | 'any' | undefined;
  private beforeOutcomeOf: number | undefined;
  private readonly deadTokens = new Set<string>();

  /** The next dispatch of step `index` (any step by default) is written, then the process dies. */
  crashAfterDispatch(index: number | 'any' = 'any'): void {
    this.afterDispatchOf = index;
  }

  /**
   * The process dies right before writing the outcome of step `index`: the
   * call has already applied its effect, but the log still says dispatched.
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
