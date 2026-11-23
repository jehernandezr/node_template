import { DomainError } from '@platform/kernel';
import type { PlatformErrorCode } from '@contracts/platform';
import type { ReportsErrorCode } from '@contracts/reports';

/** Regla de reports que no se cumple. El estado HTTP y la audiencia salen del catálogo del contrato. */
export class ReportsError extends DomainError {
  constructor(
    readonly code: ReportsErrorCode | PlatformErrorCode,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(code, details);
  }
}
