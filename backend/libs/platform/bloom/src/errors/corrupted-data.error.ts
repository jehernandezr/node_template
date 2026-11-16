import { FailureKind } from '@platform/kernel';
import { BloomError } from './bloom-error.js';
import { BloomErrorCode } from './bloom-error-code.enum.js';

/** Los datos serializados o los bits crudos no coinciden con el tamaño declarado. */
export class CorruptedDataError extends BloomError {
  constructor(message: string) {
    super(BloomErrorCode.CorruptedData, message, FailureKind.Permanent);
  }
}
