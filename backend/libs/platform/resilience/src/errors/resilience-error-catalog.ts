import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { ResilienceErrorCode } from './resilience-error-code.enum.js';

/** Catalog of the `@platform/resilience` codes. */
export const resilienceErrorCatalog = defineErrorCatalog(ResilienceErrorCode, {
  [ResilienceErrorCode.CircuitOpen]: ErrorSpecs.pub(
    503,
    true,
    'Un servicio del que depende la operación no está disponible por ahora.',
  ),
  [ResilienceErrorCode.Timeout]: ErrorSpecs.pub(
    504,
    true,
    'La operación tardó más de lo permitido.',
  ),
  [ResilienceErrorCode.BulkheadFull]: ErrorSpecs.pub(
    503,
    true,
    'Hay demasiadas operaciones en curso. Intenta de nuevo en unos instantes.',
  ),
  [ResilienceErrorCode.UnknownPolicy]: ErrorSpecs.internal(
    500,
    false,
    'No existe la política de resiliencia pedida.',
  ),
  [ResilienceErrorCode.InvalidPolicy]: ErrorSpecs.internal(
    500,
    false,
    'La configuración de una política de resiliencia no es válida.',
  ),
});
