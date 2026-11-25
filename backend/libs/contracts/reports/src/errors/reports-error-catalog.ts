import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { ReportsErrorCode as C } from '../enums/identifiers.enum.js';

const pub = ErrorSpecs.pub;

/** Catalog of the reports codes. */
export const reportsErrorCatalog = defineErrorCatalog(C, {
  [C.RunNotFound]: pub(404, false, 'The report run does not exist.'),
  [C.RunNotReady]: pub(
    409,
    false,
    'The run has not finished yet: the result is not ready.',
  ),
  [C.RunExpired]: pub(
    410,
    false,
    'The run result expired and is no longer stored. Generate the report again.',
  ),
  [C.TypeUnknown]: pub(400, false, 'The report type does not exist.'),
  [C.ParamsInvalidRange]: pub(
    400,
    false,
    'The date range is invalid: the end is before the start or exceeds the maximum.',
  ),
  [C.ResultTooLarge]: pub(
    422,
    false,
    'The result exceeds the maximum size. Narrow the date range.',
  ),
});
