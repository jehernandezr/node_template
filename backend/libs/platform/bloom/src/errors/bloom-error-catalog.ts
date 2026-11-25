import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { BloomErrorCode } from './bloom-error-code.enum.js';

/** Catalog of the `@platform/bloom` codes; none reaches the client. */
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
