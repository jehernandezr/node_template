import { PlatformError } from '@platform/kernel';
import type { CriteriaErrorCode } from './criteria-error-code.enum.js';

/** Se lanza cuando un criterio se construye o se traduce con datos inválidos. */
export class CriteriaError extends PlatformError {
  /** Código estable con formato `PLATFORM.CRITERIA.<ERROR>`. */
  readonly code: CriteriaErrorCode;

  constructor(code: CriteriaErrorCode, message: string) {
    super(message);
    this.name = 'CriteriaError';
    this.code = code;
  }
}
