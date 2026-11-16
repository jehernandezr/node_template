import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { BloomErrorCode } from './bloom-error-code.enum.js';

/** Catálogo de los códigos de `@platform/bloom`; ninguno llega al cliente. */
export const bloomErrorCatalog = defineErrorCatalog(BloomErrorCode, {
  [BloomErrorCode.InvalidParameters]: ErrorSpecs.internal(
    500,
    false,
    'Los parámetros del filtro de Bloom son inválidos.',
  ),
  [BloomErrorCode.CorruptedData]: ErrorSpecs.internal(
    500,
    false,
    'Los datos serializados del filtro de Bloom están corruptos.',
  ),
  [BloomErrorCode.IncompatibleFilters]: ErrorSpecs.internal(
    500,
    false,
    'Los filtros de Bloom no tienen los mismos parámetros.',
  ),
});
