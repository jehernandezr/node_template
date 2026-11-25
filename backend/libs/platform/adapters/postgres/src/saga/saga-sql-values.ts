import { SagaStatus, StepDirection, StepStatus } from '@platform/saga';
import { EnumSql } from '../entities/enum-sql.js';

/** SQL lists of the saga statuses, for the `CHECK` of their columns and the partial indexes. */
export class SagaSqlValues {
  static readonly STATUSES = EnumSql.of(SagaStatus);
  static readonly DIRECTIONS = EnumSql.of(StepDirection);
  static readonly STEP_STATUSES = EnumSql.of(StepStatus);
  /** Statuses that a run still has to handle. */
  static readonly OPEN_STATUSES = EnumSql.list([
    SagaStatus.Running,
    SagaStatus.Compensating,
    SagaStatus.Suspended,
  ]);
  /** Statuses finished successfully: the ones retention deletes. */
  static readonly PURGEABLE_STATUSES = EnumSql.list([
    SagaStatus.Completed,
    SagaStatus.Compensated,
  ]);
}
