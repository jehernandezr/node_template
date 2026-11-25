import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
import { BillingErrorCode } from '@contracts/billing';
import { Permission, SessionGuardErrors } from '@contracts/identity';
import { TasksErrorCode, TasksRoute } from '../enums/identifiers.enum.js';
import {
  CreateTaskRequestSchema,
  DeleteTaskRequestSchema,
  GetTaskRequestSchema,
  ListTasksRequestSchema,
  TaskPageSchema,
  TaskSchema,
  UpdateTaskRequestSchema,
} from '../schemas/task.schema.js';

/** The task routes are the integration ones: a service account consumes its call quota. */
const integrationErrors = [
  ...SessionGuardErrors,
  BillingErrorCode.QuotaExceeded,
];

/** `GET /v1/tasks`: paginated listing or text search, with a status filter. */
export const ListTasksRoute = defineRoute({
  id: TasksRoute.ListTasks,
  method: HttpMethod.Get,
  path: '/v1/tasks',
  request: ListTasksRequestSchema,
  response: TaskPageSchema,
  errors: [
    ...integrationErrors,
    PlatformErrorCode.ValidationInvalidInput,
    TasksErrorCode.SearchQueryTooShort,
  ],
  access: Access.authenticated({ permissions: [Permission.TasksRead] }),
  description: 'Lists the tasks of the active tenant or searches them by text.',
});

/** `GET /v1/tasks/{taskId}`: detail of a task. */
export const GetTaskRoute = defineRoute({
  id: TasksRoute.GetTask,
  method: HttpMethod.Get,
  path: '/v1/tasks/{taskId}',
  request: GetTaskRequestSchema,
  response: TaskSchema,
  errors: [...integrationErrors, TasksErrorCode.TaskNotFound],
  access: Access.authenticated({ permissions: [Permission.TasksRead] }),
  description: 'Returns a task of the active tenant.',
});

/** `POST /v1/tasks`: creates a task in the active tenant. */
export const CreateTaskRoute = defineRoute({
  id: TasksRoute.CreateTask,
  method: HttpMethod.Post,
  path: '/v1/tasks',
  request: CreateTaskRequestSchema,
  response: TaskSchema,
  successStatus: 201,
  errors: [...integrationErrors, PlatformErrorCode.ValidationInvalidInput],
  access: Access.authenticated({ permissions: [Permission.TasksWrite] }),
  description: 'Creates a task in the active tenant.',
});

/** `PATCH /v1/tasks/{taskId}`: changes title, description or status. */
export const UpdateTaskRoute = defineRoute({
  id: TasksRoute.UpdateTask,
  method: HttpMethod.Patch,
  path: '/v1/tasks/{taskId}',
  request: UpdateTaskRequestSchema,
  response: TaskSchema,
  errors: [
    ...integrationErrors,
    PlatformErrorCode.ValidationInvalidInput,
    TasksErrorCode.TaskNotFound,
    TasksErrorCode.TaskVersionConflict,
  ],
  access: Access.authenticated({ permissions: [Permission.TasksWrite] }),
  description:
    'Changes fields of a task. With expectedVersion, rejects the change if the task was modified before.',
});

/** `DELETE /v1/tasks/{taskId}`: soft delete of a task. */
export const DeleteTaskRoute = defineRoute({
  id: TasksRoute.DeleteTask,
  method: HttpMethod.Delete,
  path: '/v1/tasks/{taskId}',
  request: DeleteTaskRequestSchema,
  errors: [...integrationErrors, TasksErrorCode.TaskNotFound],
  access: Access.authenticated({ permissions: [Permission.TasksWrite] }),
  description: 'Soft deletes a task.',
});
