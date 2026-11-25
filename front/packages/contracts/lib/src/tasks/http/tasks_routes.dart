// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';
import '../../tasks/schemas/tasks_schemas.dart';
import '../../tasks/types/tasks_types.dart';

/// Public HTTP routes of the `tasks` contract.
abstract final class TasksRoutes {
  /// Lists the tasks of the active tenant or searches them by text.
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
      'BILLING.QUOTA.EXCEEDED',
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

  /// Returns a task of the active tenant.
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
      'BILLING.QUOTA.EXCEEDED',
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

  /// Creates a task in the active tenant.
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
      'BILLING.QUOTA.EXCEEDED',
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

  /// Changes fields of a task. With expectedVersion, rejects the change if the task was modified before.
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
      'BILLING.QUOTA.EXCEEDED',
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

  /// Soft deletes a task.
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
      'BILLING.QUOTA.EXCEEDED',
      'TASKS.TASK.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['tasks:write'],
    platformRoles: <String>[],
    encodeRequest: DeleteTaskRequest.encode,
    validateRequest: DeleteTaskRequestSchema.validate,
  );
}
