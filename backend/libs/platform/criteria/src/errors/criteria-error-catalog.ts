import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { CriteriaErrorCode } from './criteria-error-code.enum.js';

/**
 * Catalog of the `@platform/criteria` codes. Repeats the HTTP status and audience the central catalog
 * has today, so no observable code changes.
 */
export const criteriaErrorCatalog = defineErrorCatalog(CriteriaErrorCode, {
  [CriteriaErrorCode.UnknownField]: ErrorSpecs.pub(
    400,
    false,
    'The query filters or sorts by a field that does not exist.',
  ),
  [CriteriaErrorCode.InvalidValue]: ErrorSpecs.pub(
    400,
    false,
    'The query has an invalid value or cursor.',
  ),
  [CriteriaErrorCode.InvalidLimit]: ErrorSpecs.pub(
    400,
    false,
    'The page size is outside the allowed range.',
  ),
});
