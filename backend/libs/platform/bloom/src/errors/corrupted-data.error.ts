import { FailureKind } from '@platform/kernel';
import { BloomError } from './bloom-error.js';
import { BloomErrorCode } from './bloom-error-code.enum.js';

/** The serialized data or the raw bits do not match the declared size. */
export class CorruptedDataError extends BloomError {
  constructor(message: string) {
    super(BloomErrorCode.CorruptedData, message, FailureKind.Permanent);
  }
}
