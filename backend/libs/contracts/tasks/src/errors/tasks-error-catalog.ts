import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { TasksErrorCode as C } from '../enums/identifiers.enum.js';

const pub = ErrorSpecs.pub;

/** Catalog of the tasks codes. */
export const tasksErrorCatalog = defineErrorCatalog(C, {
  [C.TaskNotFound]: pub(
    404,
    false,
    'The task does not exist in the active tenant.',
  ),
  [C.TaskVersionConflict]: pub(
    409,
    false,
    'The task changed since it was read: the expected version is no longer the current one.',
  ),
  [C.SearchQueryTooShort]: pub(
    400,
    false,
    'The search text is shorter than the allowed minimum.',
  ),
});
