import { DomainError } from '@platform/kernel';
import type { PlatformErrorCode } from '@contracts/platform';
import type { ReportsErrorCode } from '@contracts/reports';

/** A reports rule that is not met. The HTTP status and the audience come from the contract catalog. */
export class ReportsError extends DomainError {
  constructor(
    readonly code: ReportsErrorCode | PlatformErrorCode,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(code, details);
  }
}
