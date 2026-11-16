import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { CriteriaErrorCode } from './criteria-error-code.enum.js';

/**
 * Catálogo de los códigos de `@platform/criteria`. Repite el estado HTTP y la audiencia que hoy tiene el catálogo
 * central, así que ningún código observable cambia.
 */
export const criteriaErrorCatalog = defineErrorCatalog(CriteriaErrorCode, {
  [CriteriaErrorCode.UnknownField]: ErrorSpecs.pub(
    400,
    false,
    'La consulta filtra u ordena por un campo que no existe.',
  ),
  [CriteriaErrorCode.InvalidValue]: ErrorSpecs.pub(
    400,
    false,
    'La consulta tiene un valor o un cursor inválido.',
  ),
  [CriteriaErrorCode.InvalidLimit]: ErrorSpecs.pub(
    400,
    false,
    'El tamaño de página está fuera del rango permitido.',
  ),
});
