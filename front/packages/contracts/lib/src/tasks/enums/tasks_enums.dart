// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

/// Status of a task.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum TaskStatus {
  open('open'),
  inProgress('in_progress'),
  done('done');

  const TaskStatus(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static TaskStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Task field that a change can modify.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum TaskField {
  title('title'),
  description('description'),
  status('status');

  const TaskField(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static TaskField? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Public error codes of the `tasks` contract.
///
/// Only includes codes with `public` audience: internal ones never
/// reach the client. [messageKey] is the message key in the ARB.
enum TasksErrorCode {
  /// The task does not exist in the active tenant.
  taskNotFound(
    'TASKS.TASK.NOT_FOUND',
    httpStatus: 404,
    retryable: false,
    messageKey: 'error_tasks_task_not_found',
  ),

  /// The task changed since it was read: the expected version is no longer the current one.
  taskVersionConflict(
    'TASKS.TASK.VERSION_CONFLICT',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_tasks_task_version_conflict',
  ),

  /// The search text is shorter than the allowed minimum.
  searchQueryTooShort(
    'TASKS.SEARCH.QUERY_TOO_SHORT',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_tasks_search_query_too_short',
  );

  const TasksErrorCode(
    this.code, {
    required this.httpStatus,
    required this.retryable,
    required this.messageKey,
  });

  /// Exact code sent by the backend, for example `TASKS.TASK.NOT_FOUND`.
  final String code;

  /// HTTP status the backend responds with.
  final int httpStatus;

  /// Whether the client may retry the same request.
  final bool retryable;

  /// ARB key of the human-readable message.
  final String messageKey;

  /// Same as [code].
  String get wireCode => code;

  /// Value with [code], or null if this client does not know it.
  static TasksErrorCode? fromCode(String code) {
    for (final value in values) {
      if (value.code == code) return value;
    }
    return null;
  }

  /// Same as [fromCode].
  static TasksErrorCode? tryParse(String code) => fromCode(code);
}

/// Enum `TasksRoute` of the `tasks` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum TasksRoute {
  listTasks('tasks.task.list'),
  getTask('tasks.task.get'),
  createTask('tasks.task.create'),
  updateTask('tasks.task.update'),
  deleteTask('tasks.task.delete');

  const TasksRoute(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static TasksRoute? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `TasksOperation` of the `tasks` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum TasksOperation {
  listChanges('tasks.tasks.list-changes.v1'),
  eraseUserData('tasks.user-data.erase.v1'),
  tenantMoveSync('tasks.tenant-move.sync.v1'),
  tenantMoveFinalize('tasks.tenant-move.finalize.v1'),
  tenantMoveAbort('tasks.tenant-move.abort.v1'),
  tenantMoveSwitch('tasks.tenant-move.switch.v1'),
  tenantMoveCleanup('tasks.tenant-move.cleanup.v1'),
  tenantDirectoryPlace('tasks.tenant-directory.place.v1'),
  tenantDirectoryRemove('tasks.tenant-directory.remove.v1');

  const TasksOperation(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static TasksOperation? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `TasksEvent` of the `tasks` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum TasksEvent {
  taskCreated('tasks.task.created.v1'),
  taskUpdated('tasks.task.updated.v1'),
  taskDeleted('tasks.task.deleted.v1');

  const TasksEvent(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static TasksEvent? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `TasksTopic` of the `tasks` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum TasksTopic {
  events('tasks-events');

  const TasksTopic(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static TasksTopic? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}
