import { ErrorDescriptor } from '@platform/kernel';
import type { ResilienceEventDetail } from './resilience-event.js';

/** Extrae del error solo los campos seguros de registrar. */
export class ErrorEventDetail {
  /** Nombre y código del error; el código solo si tiene la forma `SERVICIO.SUBMODULO.ERROR`. */
  static of(
    error: unknown,
  ): Pick<ResilienceEventDetail, 'errorName' | 'errorCode'> {
    const description = ErrorDescriptor.describe(error);
    return { errorName: description.name, errorCode: description.code };
  }
}
