import type { CallOutcome, FinalOutcome } from '@platform/primitives';
import { UnitStage } from './unit-stage.enum.js';

/**
 * What the `UnitOfWorkRunner` needs to know when recovering from a failure: how
 * far the unit of work got and which result was already decided. It lives outside
 * the transaction because the rollback undoes the effects, not this record.
 */
export class UnitProgress {
  stage: UnitStage = UnitStage.Begin;
  /** Result that is not stored (transient, uncertain or violation): the unit is rolled back. */
  rejected?: CallOutcome<unknown>;
  /** The handler threw: the error is classified when recovering. */
  thrown?: { readonly error: unknown };
  /** The handler asked to roll back its unit with a final result: it is stored separately. */
  rolledBack?: FinalOutcome<unknown>;
}
