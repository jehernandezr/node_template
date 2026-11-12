import { PlatformError } from '@platform/kernel';
import type { CriteriaErrorCode } from './enums.js';

/** Thrown when a criteria is built or translated with invalid input. */
export class CriteriaError extends PlatformError {
  /** Stable code, format `PLATFORM.CRITERIA.<ERROR>`. */
  readonly code: CriteriaErrorCode;

  constructor(code: CriteriaErrorCode, message: string) {
    super(message);
    this.name = 'CriteriaError';
    this.code = code;
  }
}
