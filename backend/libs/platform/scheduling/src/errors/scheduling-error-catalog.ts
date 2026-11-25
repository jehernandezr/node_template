import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { SchedulingErrorCode } from './scheduling-error-code.enum.js';

/** Catalog of the `@platform/scheduling` codes; none of them reaches the client. */
export const schedulingErrorCatalog = defineErrorCatalog(SchedulingErrorCode, {
  [SchedulingErrorCode.InvalidSchedule]: ErrorSpecs.internal(
    500,
    false,
    'The schedule of a job is not valid.',
  ),
  [SchedulingErrorCode.InvalidCronExpression]: ErrorSpecs.internal(
    500,
    false,
    'The cron expression of a job is not valid.',
  ),
  [SchedulingErrorCode.DuplicateJob]: ErrorSpecs.internal(
    500,
    false,
    'Two jobs were registered with the same name.',
  ),
  [SchedulingErrorCode.UnknownJob]: ErrorSpecs.internal(
    404,
    false,
    'The requested job is not registered.',
  ),
});
