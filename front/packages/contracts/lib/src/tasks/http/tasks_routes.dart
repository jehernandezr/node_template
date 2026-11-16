// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';
import '../../tasks/schemas/tasks_schemas.dart';
import '../../tasks/types/tasks_types.dart';

/// Rutas HTTP públicas del contrato `tasks`.
abstract final class TasksRoutes {
  /// Lista las tareas del tenant activo o las busca por texto.
  ///
  /// `GET /v1/tasks`
  static const listTasks = RouteDescriptor<ListTasksRequest, TaskPage>(
    id: 'tasks.task.list',
    method: HttpMethod.get,
    path: '/v1/tasks',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.VALIDATION.INVALID_INPUT',
      'TASKS.SEARCH.QUERY_TOO_SHORT',
    ],
    requiresAuth: true,
    permissions: <String>['tasks:read'],
    platformRoles: <String>[],
    encodeRequest: ListTasksRequest.encode,
    validateRequest: ListTasksRequestSchema.validate,
    validateResponse: TaskPageSchema.validateIncoming,
    decodeResponse: TaskPage.fromJson,
  );

  /// Devuelve una tarea del tenant activo.
  ///
  /// `GET /v1/tasks/{taskId}`
  static const getTask = RouteDescriptor<GetTaskRequest, Task>(
    id: 'tasks.task.get',
    method: HttpMethod.get,
    path: '/v1/tasks/{taskId}',
    version: 1,
    pathParams: <String>['taskId'],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'TASKS.TASK.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['tasks:read'],
    platformRoles: <String>[],
    encodeRequest: GetTaskRequest.encode,
    validateRequest: GetTaskRequestSchema.validate,
    validateResponse: TaskSchema.validateIncoming,
    decodeResponse: Task.fromJson,
  );

  /// Crea una tarea en el tenant activo.
  ///
  /// `POST /v1/tasks`
  static const createTask = RouteDescriptor<CreateTaskRequest, Task>(
    id: 'tasks.task.create',
    method: HttpMethod.post,
    path: '/v1/tasks',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 201,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.VALIDATION.INVALID_INPUT',
    ],
    requiresAuth: true,
    permissions: <String>['tasks:write'],
    platformRoles: <String>[],
    encodeRequest: CreateTaskRequest.encode,
    validateRequest: CreateTaskRequestSchema.validate,
    validateResponse: TaskSchema.validateIncoming,
    decodeResponse: Task.fromJson,
  );

  /// Cambia campos de una tarea. Con expectedVersion, rechaza el cambio si la tarea se modificó antes.
  ///
  /// `PATCH /v1/tasks/{taskId}`
  static const updateTask = RouteDescriptor<UpdateTaskRequest, Task>(
    id: 'tasks.task.update',
    method: HttpMethod.patch,
    path: '/v1/tasks/{taskId}',
    version: 1,
    pathParams: <String>['taskId'],
    requestLocation: RequestLocation.body,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.VALIDATION.INVALID_INPUT',
      'TASKS.TASK.NOT_FOUND',
      'TASKS.TASK.VERSION_CONFLICT',
    ],
    requiresAuth: true,
    permissions: <String>['tasks:write'],
    platformRoles: <String>[],
    encodeRequest: UpdateTaskRequest.encode,
    validateRequest: UpdateTaskRequestSchema.validate,
    validateResponse: TaskSchema.validateIncoming,
    decodeResponse: Task.fromJson,
  );

  /// Borra una tarea de forma lógica.
  ///
  /// `DELETE /v1/tasks/{taskId}`
  static const deleteTask = RouteDescriptor<DeleteTaskRequest, void>(
    id: 'tasks.task.delete',
    method: HttpMethod.delete,
    path: '/v1/tasks/{taskId}',
    version: 1,
    pathParams: <String>['taskId'],
    requestLocation: RequestLocation.query,
    successStatus: 204,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'TASKS.TASK.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['tasks:write'],
    platformRoles: <String>[],
    encodeRequest: DeleteTaskRequest.encode,
    validateRequest: DeleteTaskRequestSchema.validate,
  );
}
