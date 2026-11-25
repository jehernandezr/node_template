import { PlatformError } from '@platform/kernel';
import { DemoErrorCode } from './demo-error-code.enum.js';

/** Business conflict of the test service, with its own code. */
export class DemoConflictError extends PlatformError {
  override readonly code = DemoErrorCode.ItemConflict;
}
