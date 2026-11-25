import { SagaError } from '../../errors/saga-error.js';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { SagaInstance } from '../../model/saga-instance.js';
import type { SagaInstanceProps } from '../../model/saga-instance-props.js';
import { SagaPayload } from '../../model/saga-payload.js';
import { SagaStatus } from '../../model/saga-status.enum.js';
import { StepDirection } from '../../model/step-direction.enum.js';
import type { StepLogEntry } from '../../model/step-log-entry.js';
import { StepStatus } from '../../model/step-status.enum.js';
import type { DispatchWrite } from '../../store/dispatch-write.js';
import type { FencedWrite } from '../../store/fenced-write.js';
import type { SagaPurge } from '../../store/saga-purge.js';
import { SagaStore } from '../../store/saga-store.js';

/** In-memory `SagaStore`. Every read and write goes through a JSON copy, as in a real database. */
export class InMemorySagaStore extends SagaStore {
  private readonly instances = new Map<string, SagaInstanceProps>();
  private readonly log = new Map<string, StepLogEntry[]>();

  async create(instance: SagaInstance): Promise<void> {
    const keyTaken =
      instance.idempotencyKey !== null &&
      [...this.instances.values()].some(
        (stored) => stored.idempotencyKey === instance.idempotencyKey,
      );
    if (this.instances.has(instance.id) || keyTaken) {
      throw new SagaError(
        SagaErrorCode.DuplicateSaga,
        `Saga ${instance.id} or its idempotency key already exists`,
      );
    }
    this.instances.set(instance.id, InMemorySagaStore.copy(instance.toProps()));
  }

  async get(id: string): Promise<SagaInstance | null> {
    const found = this.instances.get(id);
    return found === undefined
      ? null
      : SagaInstance.rehydrate(InMemorySagaStore.copy(found));
  }

  async findByIdempotencyKey(key: string): Promise<SagaInstance | null> {
    const found = [...this.instances.values()].find(
      (instance) => instance.idempotencyKey === key,
    );
    return found === undefined
      ? null
      : SagaInstance.rehydrate(InMemorySagaStore.copy(found));
  }

  async commitStep(write: FencedWrite): Promise<SagaInstance> {
    return this.fencedWrite(write);
  }

  async dispatchStep(write: DispatchWrite): Promise<SagaInstance> {
    if (write.step.status !== StepStatus.Dispatched) {
      throw new SagaError(
        SagaErrorCode.InvalidState,
        'dispatchStep requires a step in Dispatched status',
      );
    }
    return this.fencedWrite(write);
  }

  async steps(sagaId: string): Promise<StepLogEntry[]> {
    return [...(this.log.get(sagaId) ?? [])]
      .sort(
        (a, b) =>
          a.stepIndex - b.stepIndex ||
          directionRank(a.direction) - directionRank(b.direction),
      )
      .map((entry) => InMemorySagaStore.copyEntry(entry));
  }

  async findRecoverable(now: Date, limit: number): Promise<SagaInstance[]> {
    const time = now.getTime();
    return [...this.instances.values()]
      .filter((instance) => {
        const leaseExpired =
          instance.leaseUntil === null || instance.leaseUntil.getTime() <= time;
        if (
          (instance.status === SagaStatus.Running ||
            instance.status === SagaStatus.Compensating) &&
          leaseExpired
        ) {
          return true;
        }
        return (
          instance.status === SagaStatus.Suspended &&
          instance.nextAttemptAt !== null &&
          instance.nextAttemptAt.getTime() <= time
        );
      })
      .sort(
        (a, b) =>
          a.updatedAt.getTime() - b.updatedAt.getTime() ||
          a.id.localeCompare(b.id),
      )
      .slice(0, limit)
      .map((props) => SagaInstance.rehydrate(InMemorySagaStore.copy(props)));
  }

  async tryAcquireLease(
    id: string,
    token: string,
    until: Date,
    now: Date,
  ): Promise<boolean> {
    const current = this.instances.get(id);
    if (current === undefined) {
      return false;
    }
    const free =
      current.leaseToken === null ||
      current.leaseUntil === null ||
      current.leaseUntil.getTime() <= now.getTime();
    if (!free) {
      return false;
    }
    this.instances.set(id, {
      ...current,
      leaseToken: token,
      leaseUntil: new Date(until.getTime()),
    });
    return true;
  }

  async renewLease(id: string, token: string, until: Date): Promise<boolean> {
    const current = this.instances.get(id);
    if (current === undefined || current.leaseToken !== token) {
      return false;
    }
    this.instances.set(id, {
      ...current,
      leaseUntil: new Date(until.getTime()),
    });
    return true;
  }

  async releaseLease(id: string, token: string): Promise<void> {
    const current = this.instances.get(id);
    if (current !== undefined && current.leaseToken === token) {
      this.instances.set(id, {
        ...current,
        leaseToken: null,
        leaseUntil: null,
      });
    }
  }

  async purge(options: SagaPurge): Promise<number> {
    const limit = options.limit ?? SagaStore.DEFAULT_PURGE_LIMIT;
    const doomed = [...this.instances.values()]
      .filter(
        (instance) =>
          (instance.status === SagaStatus.Completed ||
            instance.status === SagaStatus.Compensated) &&
          instance.updatedAt.getTime() < options.before.getTime(),
      )
      .slice(0, limit);
    for (const instance of doomed) {
      this.instances.delete(instance.id);
      this.log.delete(instance.id);
    }
    return doomed.length;
  }

  /** Synchronous, so the lease check, the version check and the two writes are atomic. */
  private fencedWrite(write: FencedWrite): SagaInstance {
    const id = write.instance.id;
    const current = this.instances.get(id);
    if (current === undefined) {
      throw new SagaError(SagaErrorCode.NotFound, `Saga ${id} not found`);
    }
    if (current.leaseToken !== write.leaseToken) {
      throw new SagaError(
        SagaErrorCode.LeaseLost,
        `Lease on saga ${id} was lost`,
      );
    }
    if (current.version !== write.expectedVersion) {
      throw new SagaError(
        SagaErrorCode.ConcurrentModification,
        `Saga ${id} is at version ${current.version}, expected ${write.expectedVersion}`,
      );
    }
    const saved: SagaInstanceProps = {
      ...InMemorySagaStore.copy(write.instance.toProps()),
      version: write.expectedVersion + 1,
      leaseToken: current.leaseToken,
      leaseUntil: current.leaseUntil,
    };
    this.instances.set(id, saved);
    const step = write.step;
    if (step !== undefined) {
      const entries = this.log.get(id) ?? [];
      const position = entries.findIndex(
        (entry) =>
          entry.stepIndex === step.stepIndex &&
          entry.direction === step.direction,
      );
      if (position === -1) {
        entries.push(InMemorySagaStore.copyEntry(step));
      } else {
        entries[position] = InMemorySagaStore.copyEntry(step);
      }
      this.log.set(id, entries);
    }
    return SagaInstance.rehydrate(InMemorySagaStore.copy(saved));
  }

  private static copy(props: SagaInstanceProps): SagaInstanceProps {
    const date = (value: Date | null): Date | null =>
      value === null ? null : new Date(value.getTime());
    return {
      ...props,
      state: SagaPayload.clone(props.state),
      context: SagaPayload.clone(props.context),
      leaseUntil: date(props.leaseUntil),
      nextAttemptAt: date(props.nextAttemptAt),
      suspendedSince: date(props.suspendedSince),
      deadlineAt: date(props.deadlineAt),
      createdAt: new Date(props.createdAt.getTime()),
      updatedAt: new Date(props.updatedAt.getTime()),
    };
  }

  private static copyEntry(entry: StepLogEntry): StepLogEntry {
    return {
      ...entry,
      input: SagaPayload.clone(entry.input),
      output: SagaPayload.clone(entry.output),
      startedAt: new Date(entry.startedAt.getTime()),
      finishedAt:
        entry.finishedAt === null ? null : new Date(entry.finishedAt.getTime()),
    };
  }
}

function directionRank(direction: StepDirection): number {
  return direction === StepDirection.Forward ? 0 : 1;
}
