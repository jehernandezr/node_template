// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import 'package:meta/meta.dart';

import '../../core/core.dart';
import '../../platform/types/platform_types.dart';
import '../../tasks/enums/tasks_enums.dart';

/// Se creó una tarea.
@immutable
final class TaskCreatedPayload {
  const TaskCreatedPayload({
    required this.tenantId,
    required this.taskId,
    required this.status,
    required this.version,
    required this.createdBy,
    required this.createdAt,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TaskCreatedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return TaskCreatedPayload(
        tenantId: json['tenantId'] as String,
        taskId: json['taskId'] as String,
        status: decodeEnum(json['status'], TaskStatus.tryParse, 'TaskStatus'),
        version: (json['version'] as num).toInt(),
        createdBy: UserRef.fromJson(json['createdBy'] as Map<String, dynamic>),
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TaskCreatedPayload: $error', json);
    }
  }

  final String tenantId;

  final String taskId;

  final TaskStatus status;

  final int version;

  final UserRef createdBy;

  final DateTime createdAt;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'taskId': taskId,
    'status': status.wireCode,
    'version': version,
    'createdBy': createdBy.toJson(),
    'createdAt': createdAt.toUtc().toIso8601String(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TaskCreatedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TaskCreatedPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(taskId, other.taskId) &&
          contractEquals(status, other.status) &&
          contractEquals(version, other.version) &&
          contractEquals(createdBy, other.createdBy) &&
          contractEquals(createdAt, other.createdAt);

  @override
  int get hashCode =>
      contractHash([tenantId, taskId, status, version, createdBy, createdAt]);
}

/// Se cambió una tarea.
@immutable
final class TaskUpdatedPayload {
  const TaskUpdatedPayload({
    required this.tenantId,
    required this.taskId,
    required this.changedFields,
    required this.statusBefore,
    required this.statusAfter,
    required this.version,
    required this.actor,
    required this.createdBy,
    required this.updatedAt,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TaskUpdatedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return TaskUpdatedPayload(
        tenantId: json['tenantId'] as String,
        taskId: json['taskId'] as String,
        changedFields: [
          for (final e0 in json['changedFields'] as List<dynamic>)
            ?TaskField.tryParse(e0 as String),
        ],
        statusBefore: decodeEnum(
          json['statusBefore'],
          TaskStatus.tryParse,
          'TaskStatus',
        ),
        statusAfter: decodeEnum(
          json['statusAfter'],
          TaskStatus.tryParse,
          'TaskStatus',
        ),
        version: (json['version'] as num).toInt(),
        actor: UserRef.fromJson(json['actor'] as Map<String, dynamic>),
        createdBy: UserRef.fromJson(json['createdBy'] as Map<String, dynamic>),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TaskUpdatedPayload: $error', json);
    }
  }

  final String tenantId;

  final String taskId;

  final List<TaskField> changedFields;

  final TaskStatus statusBefore;

  final TaskStatus statusAfter;

  final int version;

  final UserRef actor;

  final UserRef createdBy;

  final DateTime updatedAt;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'taskId': taskId,
    'changedFields': [for (final e0 in changedFields) e0.wireCode],
    'statusBefore': statusBefore.wireCode,
    'statusAfter': statusAfter.wireCode,
    'version': version,
    'actor': actor.toJson(),
    'createdBy': createdBy.toJson(),
    'updatedAt': updatedAt.toUtc().toIso8601String(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TaskUpdatedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TaskUpdatedPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(taskId, other.taskId) &&
          contractEquals(changedFields, other.changedFields) &&
          contractEquals(statusBefore, other.statusBefore) &&
          contractEquals(statusAfter, other.statusAfter) &&
          contractEquals(version, other.version) &&
          contractEquals(actor, other.actor) &&
          contractEquals(createdBy, other.createdBy) &&
          contractEquals(updatedAt, other.updatedAt);

  @override
  int get hashCode => contractHash([
    tenantId,
    taskId,
    changedFields,
    statusBefore,
    statusAfter,
    version,
    actor,
    createdBy,
    updatedAt,
  ]);
}

/// Se borró una tarea.
@immutable
final class TaskDeletedPayload {
  const TaskDeletedPayload({
    required this.tenantId,
    required this.taskId,
    required this.status,
    required this.version,
    required this.actor,
    required this.deletedAt,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TaskDeletedPayload.fromJson(Map<String, dynamic> json) {
    try {
      return TaskDeletedPayload(
        tenantId: json['tenantId'] as String,
        taskId: json['taskId'] as String,
        status: decodeEnum(json['status'], TaskStatus.tryParse, 'TaskStatus'),
        version: (json['version'] as num).toInt(),
        actor: UserRef.fromJson(json['actor'] as Map<String, dynamic>),
        deletedAt: DateTime.parse(json['deletedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TaskDeletedPayload: $error', json);
    }
  }

  final String tenantId;

  final String taskId;

  final TaskStatus status;

  final int version;

  final UserRef actor;

  final DateTime deletedAt;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    'taskId': taskId,
    'status': status.wireCode,
    'version': version,
    'actor': actor.toJson(),
    'deletedAt': deletedAt.toUtc().toIso8601String(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TaskDeletedPayload value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TaskDeletedPayload &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(taskId, other.taskId) &&
          contractEquals(status, other.status) &&
          contractEquals(version, other.version) &&
          contractEquals(actor, other.actor) &&
          contractEquals(deletedAt, other.deletedAt);

  @override
  int get hashCode =>
      contractHash([tenantId, taskId, status, version, actor, deletedAt]);
}

/// Una tarea de la organización.
@immutable
final class Task {
  const Task({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    required this.createdBy,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory Task.fromJson(Map<String, dynamic> json) {
    try {
      return Task(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        status: decodeEnum(json['status'], TaskStatus.tryParse, 'TaskStatus'),
        version: (json['version'] as num).toInt(),
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        createdBy: UserRef.fromJson(json['createdBy'] as Map<String, dynamic>),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid Task: $error', json);
    }
  }

  final String id;

  final String title;

  final String description;

  final TaskStatus status;

  final int version;

  final DateTime createdAt;

  final DateTime updatedAt;

  final UserRef createdBy;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'title': title,
    'description': description,
    'status': status.wireCode,
    'version': version,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'updatedAt': updatedAt.toUtc().toIso8601String(),
    'createdBy': createdBy.toJson(),
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(Task value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Task &&
          contractEquals(id, other.id) &&
          contractEquals(title, other.title) &&
          contractEquals(description, other.description) &&
          contractEquals(status, other.status) &&
          contractEquals(version, other.version) &&
          contractEquals(createdAt, other.createdAt) &&
          contractEquals(updatedAt, other.updatedAt) &&
          contractEquals(createdBy, other.createdBy);

  @override
  int get hashCode => contractHash([
    id,
    title,
    description,
    status,
    version,
    createdAt,
    updatedAt,
    createdBy,
  ]);
}

/// Página de tareas del tenant.
@immutable
final class TaskPage {
  const TaskPage({required this.items, required this.nextCursor});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TaskPage.fromJson(Map<String, dynamic> json) {
    try {
      return TaskPage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            Task.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TaskPage: $error', json);
    }
  }

  final List<Task> items;

  final String? nextCursor;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TaskPage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TaskPage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Listado o búsqueda de tareas, con filtro de estado opcional.
@immutable
final class ListTasksRequest {
  const ListTasksRequest({this.status, this.q, this.limit, this.after});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory ListTasksRequest.fromJson(Map<String, dynamic> json) {
    try {
      return ListTasksRequest(
        status: json['status'] == null
            ? null
            : decodeEnum(json['status'], TaskStatus.tryParse, 'TaskStatus'),
        q: json['q'] as String?,
        limit: json['limit'] == null ? null : (json['limit'] as num).toInt(),
        after: json['after'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ListTasksRequest: $error', json);
    }
  }

  final TaskStatus? status;

  final String? q;

  final int? limit;

  final String? after;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    if (status case final value?) 'status': value.wireCode,
    'q': ?q,
    'limit': ?limit,
    'after': ?after,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(ListTasksRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ListTasksRequest &&
          contractEquals(status, other.status) &&
          contractEquals(q, other.q) &&
          contractEquals(limit, other.limit) &&
          contractEquals(after, other.after);

  @override
  int get hashCode => contractHash([status, q, limit, after]);
}

/// Tarea a consultar.
@immutable
final class GetTaskRequest {
  const GetTaskRequest({required this.taskId});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory GetTaskRequest.fromJson(Map<String, dynamic> json) {
    try {
      return GetTaskRequest(taskId: json['taskId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid GetTaskRequest: $error', json);
    }
  }

  final String taskId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'taskId': taskId};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(GetTaskRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GetTaskRequest && contractEquals(taskId, other.taskId);

  @override
  int get hashCode => contractHash([taskId]);
}

/// Alta de una tarea.
@immutable
final class CreateTaskRequest {
  const CreateTaskRequest({required this.title, this.description});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory CreateTaskRequest.fromJson(Map<String, dynamic> json) {
    try {
      return CreateTaskRequest(
        title: json['title'] as String,
        description: json['description'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid CreateTaskRequest: $error', json);
    }
  }

  final String title;

  final String? description;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'title': title,
    'description': ?description,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(CreateTaskRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CreateTaskRequest &&
          contractEquals(title, other.title) &&
          contractEquals(description, other.description);

  @override
  int get hashCode => contractHash([title, description]);
}

/// Cambios parciales de una tarea, con versión esperada opcional.
@immutable
final class UpdateTaskRequest {
  const UpdateTaskRequest({
    required this.taskId,
    this.title,
    this.description,
    this.status,
    this.expectedVersion,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory UpdateTaskRequest.fromJson(Map<String, dynamic> json) {
    try {
      return UpdateTaskRequest(
        taskId: json['taskId'] as String,
        title: json['title'] as String?,
        description: json['description'] as String?,
        status: json['status'] == null
            ? null
            : decodeEnum(json['status'], TaskStatus.tryParse, 'TaskStatus'),
        expectedVersion: json['expectedVersion'] == null
            ? null
            : (json['expectedVersion'] as num).toInt(),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid UpdateTaskRequest: $error', json);
    }
  }

  final String taskId;

  final String? title;

  final String? description;

  final TaskStatus? status;

  final int? expectedVersion;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'taskId': taskId,
    'title': ?title,
    'description': ?description,
    if (status case final value?) 'status': value.wireCode,
    'expectedVersion': ?expectedVersion,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(UpdateTaskRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UpdateTaskRequest &&
          contractEquals(taskId, other.taskId) &&
          contractEquals(title, other.title) &&
          contractEquals(description, other.description) &&
          contractEquals(status, other.status) &&
          contractEquals(expectedVersion, other.expectedVersion);

  @override
  int get hashCode =>
      contractHash([taskId, title, description, status, expectedVersion]);
}

/// Tarea a borrar.
@immutable
final class DeleteTaskRequest {
  const DeleteTaskRequest({required this.taskId});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory DeleteTaskRequest.fromJson(Map<String, dynamic> json) {
    try {
      return DeleteTaskRequest(taskId: json['taskId'] as String);
    } on TypeError catch (error) {
      throw FormatException('Invalid DeleteTaskRequest: $error', json);
    }
  }

  final String taskId;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'taskId': taskId};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(DeleteTaskRequest value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeleteTaskRequest && contractEquals(taskId, other.taskId);

  @override
  int get hashCode => contractHash([taskId]);
}

/// Tarea con la fecha de borrado lógico, si la hubo.
@immutable
final class TaskChange {
  const TaskChange({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    required this.createdBy,
    required this.deletedAt,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TaskChange.fromJson(Map<String, dynamic> json) {
    try {
      return TaskChange(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        status: decodeEnum(json['status'], TaskStatus.tryParse, 'TaskStatus'),
        version: (json['version'] as num).toInt(),
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        createdBy: UserRef.fromJson(json['createdBy'] as Map<String, dynamic>),
        deletedAt: json['deletedAt'] == null
            ? null
            : DateTime.parse(json['deletedAt'] as String),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TaskChange: $error', json);
    }
  }

  final String id;

  final String title;

  final String description;

  final TaskStatus status;

  final int version;

  final DateTime createdAt;

  final DateTime updatedAt;

  final UserRef createdBy;

  final DateTime? deletedAt;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'title': title,
    'description': description,
    'status': status.wireCode,
    'version': version,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'updatedAt': updatedAt.toUtc().toIso8601String(),
    'createdBy': createdBy.toJson(),
    'deletedAt': switch (deletedAt) {
      final value? => value.toUtc().toIso8601String(),
      null => null,
    },
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TaskChange value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TaskChange &&
          contractEquals(id, other.id) &&
          contractEquals(title, other.title) &&
          contractEquals(description, other.description) &&
          contractEquals(status, other.status) &&
          contractEquals(version, other.version) &&
          contractEquals(createdAt, other.createdAt) &&
          contractEquals(updatedAt, other.updatedAt) &&
          contractEquals(createdBy, other.createdBy) &&
          contractEquals(deletedAt, other.deletedAt);

  @override
  int get hashCode => contractHash([
    id,
    title,
    description,
    status,
    version,
    createdAt,
    updatedAt,
    createdBy,
    deletedAt,
  ]);
}

/// Página de cambios de tareas.
@immutable
final class TaskChangePage {
  const TaskChangePage({required this.items, required this.nextCursor});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory TaskChangePage.fromJson(Map<String, dynamic> json) {
    try {
      return TaskChangePage(
        items: [
          for (final e0 in json['items'] as List<dynamic>)
            TaskChange.fromJson(e0 as Map<String, dynamic>),
        ],
        nextCursor: json['nextCursor'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid TaskChangePage: $error', json);
    }
  }

  final List<TaskChange> items;

  final String? nextCursor;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'items': [for (final e0 in items) e0.toJson()],
    'nextCursor': nextCursor,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(TaskChangePage value) => value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TaskChangePage &&
          contractEquals(items, other.items) &&
          contractEquals(nextCursor, other.nextCursor);

  @override
  int get hashCode => contractHash([items, nextCursor]);
}

/// Entrada para paginar los cambios de tareas de un tenant.
@immutable
final class ListTaskChangesInput {
  const ListTaskChangesInput({
    required this.tenantId,
    this.updatedAfter,
    this.limit,
    this.after,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory ListTaskChangesInput.fromJson(Map<String, dynamic> json) {
    try {
      return ListTaskChangesInput(
        tenantId: json['tenantId'] as String,
        updatedAfter: json['updatedAfter'] == null
            ? null
            : DateTime.parse(json['updatedAfter'] as String),
        limit: json['limit'] == null ? null : (json['limit'] as num).toInt(),
        after: json['after'] as String?,
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid ListTaskChangesInput: $error', json);
    }
  }

  final String tenantId;

  final DateTime? updatedAfter;

  final int? limit;

  final String? after;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'tenantId': tenantId,
    if (updatedAfter case final value?)
      'updatedAfter': value.toUtc().toIso8601String(),
    'limit': ?limit,
    'after': ?after,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(ListTaskChangesInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ListTaskChangesInput &&
          contractEquals(tenantId, other.tenantId) &&
          contractEquals(updatedAfter, other.updatedAfter) &&
          contractEquals(limit, other.limit) &&
          contractEquals(after, other.after);

  @override
  int get hashCode => contractHash([tenantId, updatedAfter, limit, after]);
}

/// Usuario cuyos datos se anonimizan en las tareas.
@immutable
final class EraseTasksUserInput {
  const EraseTasksUserInput({required this.user});

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory EraseTasksUserInput.fromJson(Map<String, dynamic> json) {
    try {
      return EraseTasksUserInput(
        user: UserRef.fromJson(json['user'] as Map<String, dynamic>),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid EraseTasksUserInput: $error', json);
    }
  }

  final UserRef user;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{'user': user.toJson()};

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(EraseTasksUserInput value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EraseTasksUserInput && contractEquals(user, other.user);

  @override
  int get hashCode => contractHash([user]);
}

/// Filas de tareas anonimizadas para un usuario.
@immutable
final class EraseTasksUserResult {
  const EraseTasksUserResult({
    required this.userId,
    required this.affectedRows,
  });

  /// Lee el objeto desde JSON. Lanza [FormatException] si no cumple el tipo.
  factory EraseTasksUserResult.fromJson(Map<String, dynamic> json) {
    try {
      return EraseTasksUserResult(
        userId: json['userId'] as String,
        affectedRows: (json['affectedRows'] as num).toInt(),
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid EraseTasksUserResult: $error', json);
    }
  }

  final String userId;

  final int affectedRows;

  /// JSON del objeto; omite los campos opcionales nulos.
  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'affectedRows': affectedRows,
  };

  /// Igual a [toJson], para usar como tear-off constante.
  static Map<String, dynamic> encode(EraseTasksUserResult value) =>
      value.toJson();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EraseTasksUserResult &&
          contractEquals(userId, other.userId) &&
          contractEquals(affectedRows, other.affectedRows);

  @override
  int get hashCode => contractHash([userId, affectedRows]);
}
