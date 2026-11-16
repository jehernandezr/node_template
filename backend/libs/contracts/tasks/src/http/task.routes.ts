import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
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

const guard = SessionGuardErrors;

/** `GET /v1/tasks`: listado paginado o búsqueda por texto, con filtro de estado. */
export const ListTasksRoute = defineRoute({
  id: TasksRoute.ListTasks,
  method: HttpMethod.Get,
  path: '/v1/tasks',
  request: ListTasksRequestSchema,
  response: TaskPageSchema,
  errors: [
    ...guard,
    PlatformErrorCode.ValidationInvalidInput,
    TasksErrorCode.SearchQueryTooShort,
  ],
  access: Access.authenticated({ permissions: [Permission.TasksRead] }),
  description: 'Lista las tareas del tenant activo o las busca por texto.',
});

/** `GET /v1/tasks/{taskId}`: detalle de una tarea. */
export const GetTaskRoute = defineRoute({
  id: TasksRoute.GetTask,
  method: HttpMethod.Get,
  path: '/v1/tasks/{taskId}',
  request: GetTaskRequestSchema,
  response: TaskSchema,
  errors: [...guard, TasksErrorCode.TaskNotFound],
  access: Access.authenticated({ permissions: [Permission.TasksRead] }),
  description: 'Devuelve una tarea del tenant activo.',
});

/** `POST /v1/tasks`: crea una tarea en el tenant activo. */
export const CreateTaskRoute = defineRoute({
  id: TasksRoute.CreateTask,
  method: HttpMethod.Post,
  path: '/v1/tasks',
  request: CreateTaskRequestSchema,
  response: TaskSchema,
  successStatus: 201,
  errors: [...guard, PlatformErrorCode.ValidationInvalidInput],
  access: Access.authenticated({ permissions: [Permission.TasksWrite] }),
  description: 'Crea una tarea en el tenant activo.',
});

/** `PATCH /v1/tasks/{taskId}`: cambia título, descripción o estado. */
export const UpdateTaskRoute = defineRoute({
  id: TasksRoute.UpdateTask,
  method: HttpMethod.Patch,
  path: '/v1/tasks/{taskId}',
  request: UpdateTaskRequestSchema,
  response: TaskSchema,
  errors: [
    ...guard,
    PlatformErrorCode.ValidationInvalidInput,
    TasksErrorCode.TaskNotFound,
    TasksErrorCode.TaskVersionConflict,
  ],
  access: Access.authenticated({ permissions: [Permission.TasksWrite] }),
  description:
    'Cambia campos de una tarea. Con expectedVersion, rechaza el cambio si la tarea se modificó antes.',
});

/** `DELETE /v1/tasks/{taskId}`: borrado lógico de una tarea. */
export const DeleteTaskRoute = defineRoute({
  id: TasksRoute.DeleteTask,
  method: HttpMethod.Delete,
  path: '/v1/tasks/{taskId}',
  request: DeleteTaskRequestSchema,
  errors: [...guard, TasksErrorCode.TaskNotFound],
  access: Access.authenticated({ permissions: [Permission.TasksWrite] }),
  description: 'Borra una tarea de forma lógica.',
});
