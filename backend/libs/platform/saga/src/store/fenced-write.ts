import type { SagaInstance } from '../model/saga-instance.js';
import type { StepLogEntry } from '../model/step-log-entry.js';

/** Write that the store accepts only if the version and the lease token still match. */
export interface FencedWrite {
  /** New state of the instance. Its `version` and its lease fields are ignored: the store manages them. */
  readonly instance: SagaInstance;
  readonly expectedVersion: number;
  readonly leaseToken: string;
  /** Journal entry written together with the instance, if any. */
  readonly step?: StepLogEntry;
}
