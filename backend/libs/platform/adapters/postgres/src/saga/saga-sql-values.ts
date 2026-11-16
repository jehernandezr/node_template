import { SagaStatus, StepDirection, StepStatus } from '@platform/saga';
import { EnumSql } from '../entities/enum-sql.js';

/** Listas SQL de los estados de saga, para el `CHECK` de sus columnas y los índices parciales. */
export class SagaSqlValues {
  static readonly STATUSES = EnumSql.of(SagaStatus);
  static readonly DIRECTIONS = EnumSql.of(StepDirection);
  static readonly STEP_STATUSES = EnumSql.of(StepStatus);
  /** Estados que una corrida todavía tiene que atender. */
  static readonly OPEN_STATUSES = EnumSql.list([
    SagaStatus.Running,
    SagaStatus.Compensating,
    SagaStatus.Suspended,
  ]);
  /** Estados terminados con éxito: los que borra la retención. */
  static readonly PURGEABLE_STATUSES = EnumSql.list([
    SagaStatus.Completed,
    SagaStatus.Compensated,
  ]);
}
