import { RecordUsageCommand } from '@contracts/billing';
import {
  defineServiceContract,
  defineTenantDirectoryOperations,
  defineTenantMoveOperations,
} from '@contracts/platform';
import { TasksLimits } from './constants/tasks.constants.js';
import {
  TasksErrorCode,
  TasksEvent,
  TasksOperation,
  TasksRoute,
  TasksTopic,
} from './enums/identifiers.enum.js';
import { TaskField, TaskStatus } from './enums/tasks.enum.js';
import { tasksErrorCatalog } from './errors/tasks-error-catalog.js';
import {
  TaskCreatedEvent,
  TaskDeletedEvent,
  TasksEventsTopic,
  TaskUpdatedEvent,
} from './events/index.js';
import * as http from './http/index.js';
import * as internal from './internal/index.js';
import * as schemas from './schemas/index.js';

/** Las operaciones de traslado de tenant de tasks, con su tipo exacto para registrarlas y llamarlas. */
export const TasksTenantMoveOperations = defineTenantMoveOperations('tasks');

/** Las operaciones del directorio de tenants de tasks, con su tipo exacto para registrarlas y llamarlas. */
export const TasksTenantDirectoryOperations =
  defineTenantDirectoryOperations('tasks');

/** Contrato del servicio tasks: tareas del tenant, búsqueda y eventos. */
export const tasksContract = defineServiceContract({
  service: 'tasks',
  description:
    'Tareas de la organización: alta, lectura, búsqueda, cambio y borrado, y los eventos que otros servicios consumen.',
  enums: {
    TaskStatus,
    TaskField,
    TasksErrorCode,
    TasksRoute,
    TasksOperation,
    TasksEvent,
    TasksTopic,
  },
  constants: { TasksLimits },
  schemas: {
    TaskStatus: schemas.TaskStatusSchema,
    TaskField: schemas.TaskFieldSchema,
    TaskCreatedPayload: schemas.TaskCreatedPayloadSchema,
    TaskUpdatedPayload: schemas.TaskUpdatedPayloadSchema,
    TaskDeletedPayload: schemas.TaskDeletedPayloadSchema,
    Task: schemas.TaskSchema,
    TaskPage: schemas.TaskPageSchema,
    ListTasksRequest: schemas.ListTasksRequestSchema,
    GetTaskRequest: schemas.GetTaskRequestSchema,
    CreateTaskRequest: schemas.CreateTaskRequestSchema,
    UpdateTaskRequest: schemas.UpdateTaskRequestSchema,
    DeleteTaskRequest: schemas.DeleteTaskRequestSchema,
    TaskChange: schemas.TaskChangeSchema,
    TaskChangePage: schemas.TaskChangePageSchema,
    ListTaskChangesInput: schemas.ListTaskChangesInputSchema,
    EraseTasksUserInput: schemas.EraseTasksUserInputSchema,
    EraseTasksUserResult: schemas.EraseTasksUserResultSchema,
  },
  routes: {
    listTasks: http.ListTasksRoute,
    getTask: http.GetTaskRoute,
    createTask: http.CreateTaskRoute,
    updateTask: http.UpdateTaskRoute,
    deleteTask: http.DeleteTaskRoute,
  },
  operations: {
    listChanges: internal.ListTaskChangesOperation,
    eraseUserData: internal.EraseTasksUserDataOperation,
    tenantMoveSync: TasksTenantMoveOperations.tenantMoveSync,
    tenantMoveFinalize: TasksTenantMoveOperations.tenantMoveFinalize,
    tenantMoveAbort: TasksTenantMoveOperations.tenantMoveAbort,
    tenantMoveSwitch: TasksTenantMoveOperations.tenantMoveSwitch,
    tenantMoveCleanup: TasksTenantMoveOperations.tenantMoveCleanup,
    tenantDirectoryPlace: TasksTenantDirectoryOperations.tenantDirectoryPlace,
    tenantDirectoryRemove: TasksTenantDirectoryOperations.tenantDirectoryRemove,
  },
  events: {
    taskCreated: TaskCreatedEvent,
    taskUpdated: TaskUpdatedEvent,
    taskDeleted: TaskDeletedEvent,
  },
  topics: { events: TasksEventsTopic },
  sends: [RecordUsageCommand],
  errors: { TasksErrorCode: tasksErrorCatalog },
});
