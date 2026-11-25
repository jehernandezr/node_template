import { Compensation, defineOperation } from '@contracts/platform';
import { TasksOperation } from '../enums/identifiers.enum.js';
import {
  EraseTasksUserInputSchema,
  EraseTasksUserResultSchema,
  ListTaskChangesInputSchema,
  TaskChangePageSchema,
} from '../schemas/task.schema.js';

/** Paginates the task changes of a tenant by update date. */
export const ListTaskChangesOperation = defineOperation({
  id: TasksOperation.ListChanges,
  input: ListTaskChangesInputSchema,
  output: TaskChangePageSchema,
  idempotent: true,
  mutating: false,
  timeoutMs: 5000,
  description: 'Pages the task changes of a tenant by update date.',
});

/**
 * Anonymizes the author of a user's tasks. Runs after the saga
 * pivot: it is retried until it finishes and is not reverted.
 */
export const EraseTasksUserDataOperation = defineOperation({
  id: TasksOperation.EraseUserData,
  input: EraseTasksUserInputSchema,
  output: EraseTasksUserResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Anonymizing is irreversible and runs after the saga pivot: it is retried until finished and is not reverted.',
  errors: [],
  timeoutMs: 6_000,
  description:
    'Anonymizes the user as author of the tasks. The tasks are kept.',
});
