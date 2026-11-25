import { PlatformError } from '@platform/kernel';
import type { CriteriaErrorCode } from './criteria-error-code.enum.js';

/** Thrown when a criteria is built or translated with invalid data. */
export class CriteriaError extends PlatformError {
  /** Stable code with format `PLATFORM.CRITERIA.<ERROR>`. */
  readonly code: CriteriaErrorCode;

  constructor(code: CriteriaErrorCode, message: string) {
    super(message);
    this.name = 'CriteriaError';
    this.code = code;
  }
}
