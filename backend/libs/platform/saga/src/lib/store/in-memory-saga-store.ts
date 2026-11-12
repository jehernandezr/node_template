import { SagaError, SagaErrorCode } from '../errors.js';
import {
  SagaInstance,
  SagaStatus,
  StepLogEntry,
  StepStatus,
} from '../model.js';
import { copyDate, jsonClone } from '../util.js';
import { DispatchWrite, FencedWrite, SagaStore } from './saga-store.js';

/** In-memory `SagaStore`. Every read and write goes through a JSON round trip. */
export class InMemorySagaStore implements SagaStore {
  private readonly instances = new Map<string, SagaInstance>();
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
    this.instances.set(instance.id, cloneInstance(instance));
  }

  async get(id: string): Promise<SagaInstance | null> {
    const found = this.instances.get(id);
    return found === undefined ? null : cloneInstance(found);
  }

  async findByIdempotencyKey(key: string): Promise<SagaInstance | null> {
    const found = [...this.instances.values()].find(
      (instance) => instance.idempotencyKey === key,
    );
    return found === undefined ? null : cloneInstance(found);
  }

  async commitStep(write: FencedWrite): Promise<SagaInstance> {
    return this.fencedWrite(write, write.step);
  }

  async dispatchStep(write: DispatchWrite): Promise<SagaInstance> {
    if (write.step.status !== StepStatus.Dispatched) {
      throw new SagaError(
        SagaErrorCode.InvalidState,
        'dispatchStep requires a step in Dispatched status',
      );
    }
    return this.fencedWrite(write, write.step);
  }

  async steps(sagaId: string): Promise<StepLogEntry[]> {
    return (this.log.get(sagaId) ?? []).map(cloneEntry);
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
      .slice(0, limit)
      .map(cloneInstance);
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

  /** Synchronous, so the lease check, the version check and both writes are atomic. */
  private fencedWrite(
    write: FencedWrite,
    step: StepLogEntry | undefined,
  ): SagaInstance {
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
    const saved: SagaInstance = {
      ...cloneInstance(write.instance),
      version: write.expectedVersion + 1,
      leaseToken: current.leaseToken,
      leaseUntil: current.leaseUntil,
    };
    this.instances.set(id, saved);
    if (step !== undefined) {
      const entries = this.log.get(id) ?? [];
      const position = entries.findIndex(
        (entry) =>
          entry.stepIndex === step.stepIndex &&
          entry.direction === step.direction,
      );
      if (position === -1) {
        entries.push(cloneEntry(step));
      } else {
        entries[position] = cloneEntry(step);
      }
      this.log.set(id, entries);
    }
    return cloneInstance(saved);
  }
}

function cloneInstance(instance: SagaInstance): SagaInstance {
  return {
    ...instance,
    state: jsonClone(instance.state),
    leaseUntil: copyDate(instance.leaseUntil),
    nextAttemptAt: copyDate(instance.nextAttemptAt),
    suspendedSince: copyDate(instance.suspendedSince),
    deadlineAt: copyDate(instance.deadlineAt),
    createdAt: new Date(instance.createdAt.getTime()),
    updatedAt: new Date(instance.updatedAt.getTime()),
  };
}

function cloneEntry(entry: StepLogEntry): StepLogEntry {
  return {
    ...entry,
    input: jsonClone(entry.input),
    output: jsonClone(entry.output),
    startedAt: new Date(entry.startedAt.getTime()),
    finishedAt: copyDate(entry.finishedAt),
  };
}
