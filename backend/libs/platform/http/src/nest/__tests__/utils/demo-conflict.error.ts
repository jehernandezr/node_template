import { PlatformError } from '@platform/kernel';
import { DemoErrorCode } from './demo-error-code.enum.js';

/** Conflicto de negocio del servicio de prueba, con su código propio. */
export class DemoConflictError extends PlatformError {
  override readonly code = DemoErrorCode.ItemConflict;
}
