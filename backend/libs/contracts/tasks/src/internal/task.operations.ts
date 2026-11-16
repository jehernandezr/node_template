import { Compensation, defineOperation } from '@contracts/platform';
import { TasksOperation } from '../enums/identifiers.enum.js';
import {
  EraseTasksUserInputSchema,
  EraseTasksUserResultSchema,
  ListTaskChangesInputSchema,
  TaskChangePageSchema,
} from '../schemas/task.schema.js';

/** Pagina los cambios de tareas de un tenant por fecha de actualización. */
export const ListTaskChangesOperation = defineOperation({
  id: TasksOperation.ListChanges,
  input: ListTaskChangesInputSchema,
  output: TaskChangePageSchema,
  idempotent: true,
  mutating: false,
  timeoutMs: 5000,
  description:
    'Pagina los cambios de tareas de un tenant por fecha de actualización.',
});

/**
 * Anonimiza el autor de las tareas de un usuario. Corre después del pivote de
 * la saga: se repite hasta terminar y no se revierte.
 */
export const EraseTasksUserDataOperation = defineOperation({
  id: TasksOperation.EraseUserData,
  input: EraseTasksUserInputSchema,
  output: EraseTasksUserResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Anonimizar es irreversible y corre después del pivote de la saga: se repite hasta terminar y no se revierte.',
  errors: [],
  timeoutMs: 6_000,
  description:
    'Anonimiza al usuario como autor de las tareas. Las tareas se conservan.',
});
