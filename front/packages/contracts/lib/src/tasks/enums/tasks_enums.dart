// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

/// Estado de una tarea.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum TaskStatus {
  open('open'),
  inProgress('in_progress'),
  done('done');

  const TaskStatus(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static TaskStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Campo de una tarea que un cambio puede modificar.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum TaskField {
  title('title'),
  description('description'),
  status('status');

  const TaskField(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static TaskField? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Códigos de error públicos del contrato `tasks`.
///
/// Solo incluye los códigos con audiencia `public`: los internos nunca
/// llegan al cliente. [messageKey] es la clave del mensaje en el ARB.
enum TasksErrorCode {
  /// La tarea no existe en el tenant activo.
  taskNotFound(
    'TASKS.TASK.NOT_FOUND',
    httpStatus: 404,
    retryable: false,
    messageKey: 'error_tasks_task_not_found',
  ),

  /// La tarea cambió desde que se leyó: la versión esperada ya no es la actual.
  taskVersionConflict(
    'TASKS.TASK.VERSION_CONFLICT',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_tasks_task_version_conflict',
  ),

  /// El texto de búsqueda es más corto que el mínimo permitido.
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

  /// Código exacto que envía el backend, por ejemplo `TASKS.TASK.NOT_FOUND`.
  final String code;

  /// Estado HTTP con el que responde el backend.
  final int httpStatus;

  /// Si el cliente puede reintentar la misma petición.
  final bool retryable;

  /// Clave ARB del mensaje para personas.
  final String messageKey;

  /// Igual a [code].
  String get wireCode => code;

  /// Valor con [code], o null si este cliente no lo conoce.
  static TasksErrorCode? fromCode(String code) {
    for (final value in values) {
      if (value.code == code) return value;
    }
    return null;
  }

  /// Igual a [fromCode].
  static TasksErrorCode? tryParse(String code) => fromCode(code);
}

/// Enum `TasksRoute` del contrato `tasks`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum TasksRoute {
  listTasks('tasks.task.list'),
  getTask('tasks.task.get'),
  createTask('tasks.task.create'),
  updateTask('tasks.task.update'),
  deleteTask('tasks.task.delete');

  const TasksRoute(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static TasksRoute? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `TasksOperation` del contrato `tasks`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum TasksOperation {
  listChanges('tasks.tasks.list-changes.v1'),
  eraseUserData('tasks.user-data.erase.v1'),
  tenantMoveSync('tasks.tenant-move.sync.v1'),
  tenantMoveFinalize('tasks.tenant-move.finalize.v1'),
  tenantMoveAbort('tasks.tenant-move.abort.v1'),
  tenantMoveSwitch('tasks.tenant-move.switch.v1'),
  tenantMoveCleanup('tasks.tenant-move.cleanup.v1');

  const TasksOperation(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static TasksOperation? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `TasksEvent` del contrato `tasks`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum TasksEvent {
  taskCreated('tasks.task.created.v1'),
  taskUpdated('tasks.task.updated.v1'),
  taskDeleted('tasks.task.deleted.v1');

  const TasksEvent(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static TasksEvent? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `TasksTopic` del contrato `tasks`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum TasksTopic {
  events('tasks-events');

  const TasksTopic(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static TasksTopic? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}
