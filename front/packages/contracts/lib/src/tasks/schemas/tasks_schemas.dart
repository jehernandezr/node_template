// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';
import '../../platform/schemas/platform_schemas.dart';
import '../../tasks/types/tasks_types.dart';

final _pattern0 = RegExp(
  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})\$',
);
final _pattern1 = RegExp(
  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))\$',
);
final _pattern2 = RegExp('^[A-Za-z0-9_-]+\$');

/// Validador de [TaskCreatedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TaskCreatedPayloadSchema {
  /// Errores de [json], o una lista vacía si cumple el contrato.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errores de [json] recibido del servidor (respuesta o mensaje).
  ///
  /// Igual que [validate], pero acepta valores de enum que este cliente
  /// no conoce dentro de una lista (por ejemplo un permiso nuevo):
  /// `fromJson` los descarta en lugar de fallar.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Agrega a [errors] los errores de [json] bajo [path].
  ///
  /// Con [acceptUnknownEnums], un valor de enum desconocido dentro de
  /// una lista no es un error.
  static void check(
    Object? json,
    String path,
    List<FieldError> errors, {
    bool acceptUnknownEnums = false,
  }) {
    if (json is! Map<String, Object?>) {
      addFieldError(errors, path, PlatformErrorCode.validationInvalidType.code);
      return;
    }
    if (json.containsKey('tenantId')) {
      final value0 = json['tenantId'];
      if (value0 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value0)) {
          addFieldError(
            errors,
            joinPath(path, 'tenantId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'tenantId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('taskId')) {
      final value1 = json['taskId'];
      if (value1 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'taskId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value1)) {
          addFieldError(
            errors,
            joinPath(path, 'taskId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'taskId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value2 = json['status'];
      if (value2 is! String ||
          !const <String>{'open', 'in_progress', 'done'}.contains(value2)) {
        addFieldError(
          errors,
          joinPath(path, 'status'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'status'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('version')) {
      final value3 = json['version'];
      if (value3 is! num ||
          !value3.isFinite ||
          value3 != value3.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'version'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value3 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'version'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value3 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'version'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'version'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdBy')) {
      final value4 = json['createdBy'];
      UserRefSchema.check(
        value4,
        joinPath(path, 'createdBy'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'createdBy'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdAt')) {
      final value5 = json['createdAt'];
      if (value5 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value5)) {
          addFieldError(
            errors,
            joinPath(path, 'createdAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'createdAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TaskCreatedPayload] contra su contrato.
extension TaskCreatedPayloadValidation on TaskCreatedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TaskCreatedPayloadSchema.validate(toJson());
}

/// Validador de [TaskUpdatedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TaskUpdatedPayloadSchema {
  /// Errores de [json], o una lista vacía si cumple el contrato.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errores de [json] recibido del servidor (respuesta o mensaje).
  ///
  /// Igual que [validate], pero acepta valores de enum que este cliente
  /// no conoce dentro de una lista (por ejemplo un permiso nuevo):
  /// `fromJson` los descarta en lugar de fallar.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Agrega a [errors] los errores de [json] bajo [path].
  ///
  /// Con [acceptUnknownEnums], un valor de enum desconocido dentro de
  /// una lista no es un error.
  static void check(
    Object? json,
    String path,
    List<FieldError> errors, {
    bool acceptUnknownEnums = false,
  }) {
    if (json is! Map<String, Object?>) {
      addFieldError(errors, path, PlatformErrorCode.validationInvalidType.code);
      return;
    }
    if (json.containsKey('tenantId')) {
      final value6 = json['tenantId'];
      if (value6 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value6)) {
          addFieldError(
            errors,
            joinPath(path, 'tenantId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'tenantId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('taskId')) {
      final value7 = json['taskId'];
      if (value7 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'taskId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value7)) {
          addFieldError(
            errors,
            joinPath(path, 'taskId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'taskId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('changedFields')) {
      final value8 = json['changedFields'];
      if (value8 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'changedFields'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value8.length > 3) {
          addFieldError(
            errors,
            joinPath(path, 'changedFields'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i9 = 0; i9 < value8.length; i9++) {
          final item10 = value8[i9];
          if (item10 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'title',
                    'description',
                    'status',
                  }.contains(item10))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'changedFields'), '$i9'),
              PlatformErrorCode.validationInvalidEnum.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'changedFields'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('statusBefore')) {
      final value11 = json['statusBefore'];
      if (value11 is! String ||
          !const <String>{'open', 'in_progress', 'done'}.contains(value11)) {
        addFieldError(
          errors,
          joinPath(path, 'statusBefore'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'statusBefore'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('statusAfter')) {
      final value12 = json['statusAfter'];
      if (value12 is! String ||
          !const <String>{'open', 'in_progress', 'done'}.contains(value12)) {
        addFieldError(
          errors,
          joinPath(path, 'statusAfter'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'statusAfter'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('version')) {
      final value13 = json['version'];
      if (value13 is! num ||
          !value13.isFinite ||
          value13 != value13.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'version'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value13 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'version'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value13 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'version'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'version'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('actor')) {
      final value14 = json['actor'];
      UserRefSchema.check(
        value14,
        joinPath(path, 'actor'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'actor'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdBy')) {
      final value15 = json['createdBy'];
      UserRefSchema.check(
        value15,
        joinPath(path, 'createdBy'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'createdBy'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('updatedAt')) {
      final value16 = json['updatedAt'];
      if (value16 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'updatedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value16)) {
          addFieldError(
            errors,
            joinPath(path, 'updatedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'updatedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TaskUpdatedPayload] contra su contrato.
extension TaskUpdatedPayloadValidation on TaskUpdatedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TaskUpdatedPayloadSchema.validate(toJson());
}

/// Validador de [TaskDeletedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TaskDeletedPayloadSchema {
  /// Errores de [json], o una lista vacía si cumple el contrato.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errores de [json] recibido del servidor (respuesta o mensaje).
  ///
  /// Igual que [validate], pero acepta valores de enum que este cliente
  /// no conoce dentro de una lista (por ejemplo un permiso nuevo):
  /// `fromJson` los descarta en lugar de fallar.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Agrega a [errors] los errores de [json] bajo [path].
  ///
  /// Con [acceptUnknownEnums], un valor de enum desconocido dentro de
  /// una lista no es un error.
  static void check(
    Object? json,
    String path,
    List<FieldError> errors, {
    bool acceptUnknownEnums = false,
  }) {
    if (json is! Map<String, Object?>) {
      addFieldError(errors, path, PlatformErrorCode.validationInvalidType.code);
      return;
    }
    if (json.containsKey('tenantId')) {
      final value17 = json['tenantId'];
      if (value17 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value17)) {
          addFieldError(
            errors,
            joinPath(path, 'tenantId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'tenantId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('taskId')) {
      final value18 = json['taskId'];
      if (value18 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'taskId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value18)) {
          addFieldError(
            errors,
            joinPath(path, 'taskId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'taskId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value19 = json['status'];
      if (value19 is! String ||
          !const <String>{'open', 'in_progress', 'done'}.contains(value19)) {
        addFieldError(
          errors,
          joinPath(path, 'status'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'status'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('version')) {
      final value20 = json['version'];
      if (value20 is! num ||
          !value20.isFinite ||
          value20 != value20.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'version'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value20 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'version'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value20 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'version'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'version'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('actor')) {
      final value21 = json['actor'];
      UserRefSchema.check(
        value21,
        joinPath(path, 'actor'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'actor'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('deletedAt')) {
      final value22 = json['deletedAt'];
      if (value22 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deletedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value22)) {
          addFieldError(
            errors,
            joinPath(path, 'deletedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'deletedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TaskDeletedPayload] contra su contrato.
extension TaskDeletedPayloadValidation on TaskDeletedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TaskDeletedPayloadSchema.validate(toJson());
}

/// Validador de [Task] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TaskSchema {
  /// Errores de [json], o una lista vacía si cumple el contrato.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errores de [json] recibido del servidor (respuesta o mensaje).
  ///
  /// Igual que [validate], pero acepta valores de enum que este cliente
  /// no conoce dentro de una lista (por ejemplo un permiso nuevo):
  /// `fromJson` los descarta en lugar de fallar.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Agrega a [errors] los errores de [json] bajo [path].
  ///
  /// Con [acceptUnknownEnums], un valor de enum desconocido dentro de
  /// una lista no es un error.
  static void check(
    Object? json,
    String path,
    List<FieldError> errors, {
    bool acceptUnknownEnums = false,
  }) {
    if (json is! Map<String, Object?>) {
      addFieldError(errors, path, PlatformErrorCode.validationInvalidType.code);
      return;
    }
    if (json.containsKey('id')) {
      final value23 = json['id'];
      if (value23 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value23)) {
          addFieldError(
            errors,
            joinPath(path, 'id'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'id'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('title')) {
      final value24 = json['title'];
      if (value24 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'title'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value24.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'title'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value24.length > 200) {
          addFieldError(
            errors,
            joinPath(path, 'title'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'title'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('description')) {
      final value25 = json['description'];
      if (value25 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'description'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value25.length > 5000) {
          addFieldError(
            errors,
            joinPath(path, 'description'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'description'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value26 = json['status'];
      if (value26 is! String ||
          !const <String>{'open', 'in_progress', 'done'}.contains(value26)) {
        addFieldError(
          errors,
          joinPath(path, 'status'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'status'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('version')) {
      final value27 = json['version'];
      if (value27 is! num ||
          !value27.isFinite ||
          value27 != value27.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'version'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value27 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'version'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value27 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'version'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'version'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdAt')) {
      final value28 = json['createdAt'];
      if (value28 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value28)) {
          addFieldError(
            errors,
            joinPath(path, 'createdAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'createdAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('updatedAt')) {
      final value29 = json['updatedAt'];
      if (value29 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'updatedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value29)) {
          addFieldError(
            errors,
            joinPath(path, 'updatedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'updatedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdBy')) {
      final value30 = json['createdBy'];
      UserRefSchema.check(
        value30,
        joinPath(path, 'createdBy'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'createdBy'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [Task] contra su contrato.
extension TaskValidation on Task {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TaskSchema.validate(toJson());
}

/// Validador de [TaskPage] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TaskPageSchema {
  /// Errores de [json], o una lista vacía si cumple el contrato.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errores de [json] recibido del servidor (respuesta o mensaje).
  ///
  /// Igual que [validate], pero acepta valores de enum que este cliente
  /// no conoce dentro de una lista (por ejemplo un permiso nuevo):
  /// `fromJson` los descarta en lugar de fallar.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Agrega a [errors] los errores de [json] bajo [path].
  ///
  /// Con [acceptUnknownEnums], un valor de enum desconocido dentro de
  /// una lista no es un error.
  static void check(
    Object? json,
    String path,
    List<FieldError> errors, {
    bool acceptUnknownEnums = false,
  }) {
    if (json is! Map<String, Object?>) {
      addFieldError(errors, path, PlatformErrorCode.validationInvalidType.code);
      return;
    }
    if (json.containsKey('items')) {
      final value31 = json['items'];
      if (value31 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value31.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i32 = 0; i32 < value31.length; i32++) {
          final item33 = value31[i32];
          TaskSchema.check(
            item33,
            joinPath(joinPath(path, 'items'), '$i32'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'items'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('nextCursor')) {
      final value34 = json['nextCursor'];
      if (value34 != null) {
        if (value34 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value34.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value34.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern2.hasMatch(value34)) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'nextCursor'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TaskPage] contra su contrato.
extension TaskPageValidation on TaskPage {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TaskPageSchema.validate(toJson());
}

/// Validador de [ListTasksRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ListTasksRequestSchema {
  /// Errores de [json], o una lista vacía si cumple el contrato.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errores de [json] recibido del servidor (respuesta o mensaje).
  ///
  /// Igual que [validate], pero acepta valores de enum que este cliente
  /// no conoce dentro de una lista (por ejemplo un permiso nuevo):
  /// `fromJson` los descarta en lugar de fallar.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Agrega a [errors] los errores de [json] bajo [path].
  ///
  /// Con [acceptUnknownEnums], un valor de enum desconocido dentro de
  /// una lista no es un error.
  static void check(
    Object? json,
    String path,
    List<FieldError> errors, {
    bool acceptUnknownEnums = false,
  }) {
    if (json is! Map<String, Object?>) {
      addFieldError(errors, path, PlatformErrorCode.validationInvalidType.code);
      return;
    }
    if (json.containsKey('status')) {
      final value35 = json['status'];
      if (value35 is! String ||
          !const <String>{'open', 'in_progress', 'done'}.contains(value35)) {
        addFieldError(
          errors,
          joinPath(path, 'status'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    }
    if (json.containsKey('q')) {
      final value36 = json['q'];
      if (value36 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'q'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value36.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'q'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value36.length > 200) {
          addFieldError(
            errors,
            joinPath(path, 'q'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('limit')) {
      final value37 = json['limit'];
      if (value37 is! num ||
          !value37.isFinite ||
          value37 != value37.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'limit'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value37 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value37 > 100) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    }
    if (json.containsKey('after')) {
      final value38 = json['after'];
      if (value38 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'after'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value38.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value38.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value38)) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'status', 'q', 'limit', 'after'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [ListTasksRequest] contra su contrato.
extension ListTasksRequestValidation on ListTasksRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => ListTasksRequestSchema.validate(toJson());
}

/// Validador de [GetTaskRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class GetTaskRequestSchema {
  /// Errores de [json], o una lista vacía si cumple el contrato.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errores de [json] recibido del servidor (respuesta o mensaje).
  ///
  /// Igual que [validate], pero acepta valores de enum que este cliente
  /// no conoce dentro de una lista (por ejemplo un permiso nuevo):
  /// `fromJson` los descarta en lugar de fallar.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Agrega a [errors] los errores de [json] bajo [path].
  ///
  /// Con [acceptUnknownEnums], un valor de enum desconocido dentro de
  /// una lista no es un error.
  static void check(
    Object? json,
    String path,
    List<FieldError> errors, {
    bool acceptUnknownEnums = false,
  }) {
    if (json is! Map<String, Object?>) {
      addFieldError(errors, path, PlatformErrorCode.validationInvalidType.code);
      return;
    }
    if (json.containsKey('taskId')) {
      final value39 = json['taskId'];
      if (value39 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'taskId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value39)) {
          addFieldError(
            errors,
            joinPath(path, 'taskId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'taskId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'taskId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [GetTaskRequest] contra su contrato.
extension GetTaskRequestValidation on GetTaskRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => GetTaskRequestSchema.validate(toJson());
}

/// Validador de [CreateTaskRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class CreateTaskRequestSchema {
  /// Errores de [json], o una lista vacía si cumple el contrato.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errores de [json] recibido del servidor (respuesta o mensaje).
  ///
  /// Igual que [validate], pero acepta valores de enum que este cliente
  /// no conoce dentro de una lista (por ejemplo un permiso nuevo):
  /// `fromJson` los descarta en lugar de fallar.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Agrega a [errors] los errores de [json] bajo [path].
  ///
  /// Con [acceptUnknownEnums], un valor de enum desconocido dentro de
  /// una lista no es un error.
  static void check(
    Object? json,
    String path,
    List<FieldError> errors, {
    bool acceptUnknownEnums = false,
  }) {
    if (json is! Map<String, Object?>) {
      addFieldError(errors, path, PlatformErrorCode.validationInvalidType.code);
      return;
    }
    if (json.containsKey('title')) {
      final value40 = json['title'];
      if (value40 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'title'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value40.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'title'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value40.length > 200) {
          addFieldError(
            errors,
            joinPath(path, 'title'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'title'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('description')) {
      final value41 = json['description'];
      if (value41 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'description'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value41.length > 5000) {
          addFieldError(
            errors,
            joinPath(path, 'description'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'title', 'description'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [CreateTaskRequest] contra su contrato.
extension CreateTaskRequestValidation on CreateTaskRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => CreateTaskRequestSchema.validate(toJson());
}

/// Validador de [UpdateTaskRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UpdateTaskRequestSchema {
  /// Errores de [json], o una lista vacía si cumple el contrato.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errores de [json] recibido del servidor (respuesta o mensaje).
  ///
  /// Igual que [validate], pero acepta valores de enum que este cliente
  /// no conoce dentro de una lista (por ejemplo un permiso nuevo):
  /// `fromJson` los descarta en lugar de fallar.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Agrega a [errors] los errores de [json] bajo [path].
  ///
  /// Con [acceptUnknownEnums], un valor de enum desconocido dentro de
  /// una lista no es un error.
  static void check(
    Object? json,
    String path,
    List<FieldError> errors, {
    bool acceptUnknownEnums = false,
  }) {
    if (json is! Map<String, Object?>) {
      addFieldError(errors, path, PlatformErrorCode.validationInvalidType.code);
      return;
    }
    if (json.containsKey('taskId')) {
      final value42 = json['taskId'];
      if (value42 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'taskId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value42)) {
          addFieldError(
            errors,
            joinPath(path, 'taskId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'taskId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('title')) {
      final value43 = json['title'];
      if (value43 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'title'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value43.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'title'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value43.length > 200) {
          addFieldError(
            errors,
            joinPath(path, 'title'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('description')) {
      final value44 = json['description'];
      if (value44 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'description'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value44.length > 5000) {
          addFieldError(
            errors,
            joinPath(path, 'description'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('status')) {
      final value45 = json['status'];
      if (value45 is! String ||
          !const <String>{'open', 'in_progress', 'done'}.contains(value45)) {
        addFieldError(
          errors,
          joinPath(path, 'status'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    }
    if (json.containsKey('expectedVersion')) {
      final value46 = json['expectedVersion'];
      if (value46 is! num ||
          !value46.isFinite ||
          value46 != value46.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'expectedVersion'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value46 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'expectedVersion'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value46 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'expectedVersion'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{
        'taskId',
        'title',
        'description',
        'status',
        'expectedVersion',
      }.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [UpdateTaskRequest] contra su contrato.
extension UpdateTaskRequestValidation on UpdateTaskRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => UpdateTaskRequestSchema.validate(toJson());
}

/// Validador de [DeleteTaskRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class DeleteTaskRequestSchema {
  /// Errores de [json], o una lista vacía si cumple el contrato.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errores de [json] recibido del servidor (respuesta o mensaje).
  ///
  /// Igual que [validate], pero acepta valores de enum que este cliente
  /// no conoce dentro de una lista (por ejemplo un permiso nuevo):
  /// `fromJson` los descarta en lugar de fallar.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Agrega a [errors] los errores de [json] bajo [path].
  ///
  /// Con [acceptUnknownEnums], un valor de enum desconocido dentro de
  /// una lista no es un error.
  static void check(
    Object? json,
    String path,
    List<FieldError> errors, {
    bool acceptUnknownEnums = false,
  }) {
    if (json is! Map<String, Object?>) {
      addFieldError(errors, path, PlatformErrorCode.validationInvalidType.code);
      return;
    }
    if (json.containsKey('taskId')) {
      final value47 = json['taskId'];
      if (value47 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'taskId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value47)) {
          addFieldError(
            errors,
            joinPath(path, 'taskId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'taskId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'taskId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [DeleteTaskRequest] contra su contrato.
extension DeleteTaskRequestValidation on DeleteTaskRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => DeleteTaskRequestSchema.validate(toJson());
}

/// Validador de [TaskChange] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TaskChangeSchema {
  /// Errores de [json], o una lista vacía si cumple el contrato.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errores de [json] recibido del servidor (respuesta o mensaje).
  ///
  /// Igual que [validate], pero acepta valores de enum que este cliente
  /// no conoce dentro de una lista (por ejemplo un permiso nuevo):
  /// `fromJson` los descarta en lugar de fallar.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Agrega a [errors] los errores de [json] bajo [path].
  ///
  /// Con [acceptUnknownEnums], un valor de enum desconocido dentro de
  /// una lista no es un error.
  static void check(
    Object? json,
    String path,
    List<FieldError> errors, {
    bool acceptUnknownEnums = false,
  }) {
    if (json is! Map<String, Object?>) {
      addFieldError(errors, path, PlatformErrorCode.validationInvalidType.code);
      return;
    }
    if (json.containsKey('id')) {
      final value48 = json['id'];
      if (value48 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value48)) {
          addFieldError(
            errors,
            joinPath(path, 'id'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'id'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('title')) {
      final value49 = json['title'];
      if (value49 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'title'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value49.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'title'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value49.length > 200) {
          addFieldError(
            errors,
            joinPath(path, 'title'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'title'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('description')) {
      final value50 = json['description'];
      if (value50 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'description'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value50.length > 5000) {
          addFieldError(
            errors,
            joinPath(path, 'description'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'description'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value51 = json['status'];
      if (value51 is! String ||
          !const <String>{'open', 'in_progress', 'done'}.contains(value51)) {
        addFieldError(
          errors,
          joinPath(path, 'status'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'status'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('version')) {
      final value52 = json['version'];
      if (value52 is! num ||
          !value52.isFinite ||
          value52 != value52.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'version'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value52 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'version'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value52 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'version'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'version'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdAt')) {
      final value53 = json['createdAt'];
      if (value53 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value53)) {
          addFieldError(
            errors,
            joinPath(path, 'createdAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'createdAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('updatedAt')) {
      final value54 = json['updatedAt'];
      if (value54 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'updatedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value54)) {
          addFieldError(
            errors,
            joinPath(path, 'updatedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'updatedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdBy')) {
      final value55 = json['createdBy'];
      UserRefSchema.check(
        value55,
        joinPath(path, 'createdBy'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'createdBy'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('deletedAt')) {
      final value56 = json['deletedAt'];
      if (value56 != null) {
        if (value56 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'deletedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern1.hasMatch(value56)) {
            addFieldError(
              errors,
              joinPath(path, 'deletedAt'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'deletedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TaskChange] contra su contrato.
extension TaskChangeValidation on TaskChange {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TaskChangeSchema.validate(toJson());
}

/// Validador de [TaskChangePage] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TaskChangePageSchema {
  /// Errores de [json], o una lista vacía si cumple el contrato.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errores de [json] recibido del servidor (respuesta o mensaje).
  ///
  /// Igual que [validate], pero acepta valores de enum que este cliente
  /// no conoce dentro de una lista (por ejemplo un permiso nuevo):
  /// `fromJson` los descarta en lugar de fallar.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Agrega a [errors] los errores de [json] bajo [path].
  ///
  /// Con [acceptUnknownEnums], un valor de enum desconocido dentro de
  /// una lista no es un error.
  static void check(
    Object? json,
    String path,
    List<FieldError> errors, {
    bool acceptUnknownEnums = false,
  }) {
    if (json is! Map<String, Object?>) {
      addFieldError(errors, path, PlatformErrorCode.validationInvalidType.code);
      return;
    }
    if (json.containsKey('items')) {
      final value57 = json['items'];
      if (value57 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value57.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i58 = 0; i58 < value57.length; i58++) {
          final item59 = value57[i58];
          TaskChangeSchema.check(
            item59,
            joinPath(joinPath(path, 'items'), '$i58'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'items'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('nextCursor')) {
      final value60 = json['nextCursor'];
      if (value60 != null) {
        if (value60 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value60.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value60.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern2.hasMatch(value60)) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'nextCursor'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TaskChangePage] contra su contrato.
extension TaskChangePageValidation on TaskChangePage {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TaskChangePageSchema.validate(toJson());
}

/// Validador de [ListTaskChangesInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ListTaskChangesInputSchema {
  /// Errores de [json], o una lista vacía si cumple el contrato.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errores de [json] recibido del servidor (respuesta o mensaje).
  ///
  /// Igual que [validate], pero acepta valores de enum que este cliente
  /// no conoce dentro de una lista (por ejemplo un permiso nuevo):
  /// `fromJson` los descarta en lugar de fallar.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Agrega a [errors] los errores de [json] bajo [path].
  ///
  /// Con [acceptUnknownEnums], un valor de enum desconocido dentro de
  /// una lista no es un error.
  static void check(
    Object? json,
    String path,
    List<FieldError> errors, {
    bool acceptUnknownEnums = false,
  }) {
    if (json is! Map<String, Object?>) {
      addFieldError(errors, path, PlatformErrorCode.validationInvalidType.code);
      return;
    }
    if (json.containsKey('tenantId')) {
      final value61 = json['tenantId'];
      if (value61 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value61)) {
          addFieldError(
            errors,
            joinPath(path, 'tenantId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'tenantId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('updatedAfter')) {
      final value62 = json['updatedAfter'];
      if (value62 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'updatedAfter'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value62)) {
          addFieldError(
            errors,
            joinPath(path, 'updatedAfter'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    if (json.containsKey('limit')) {
      final value63 = json['limit'];
      if (value63 is! num ||
          !value63.isFinite ||
          value63 != value63.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'limit'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value63 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value63 > 100) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    }
    if (json.containsKey('after')) {
      final value64 = json['after'];
      if (value64 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'after'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value64.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value64.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value64)) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{
        'tenantId',
        'updatedAfter',
        'limit',
        'after',
      }.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [ListTaskChangesInput] contra su contrato.
extension ListTaskChangesInputValidation on ListTaskChangesInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => ListTaskChangesInputSchema.validate(toJson());
}

/// Validador de [EraseTasksUserInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class EraseTasksUserInputSchema {
  /// Errores de [json], o una lista vacía si cumple el contrato.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errores de [json] recibido del servidor (respuesta o mensaje).
  ///
  /// Igual que [validate], pero acepta valores de enum que este cliente
  /// no conoce dentro de una lista (por ejemplo un permiso nuevo):
  /// `fromJson` los descarta en lugar de fallar.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Agrega a [errors] los errores de [json] bajo [path].
  ///
  /// Con [acceptUnknownEnums], un valor de enum desconocido dentro de
  /// una lista no es un error.
  static void check(
    Object? json,
    String path,
    List<FieldError> errors, {
    bool acceptUnknownEnums = false,
  }) {
    if (json is! Map<String, Object?>) {
      addFieldError(errors, path, PlatformErrorCode.validationInvalidType.code);
      return;
    }
    if (json.containsKey('user')) {
      final value65 = json['user'];
      UserRefSchema.check(
        value65,
        joinPath(path, 'user'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'user'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'user'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [EraseTasksUserInput] contra su contrato.
extension EraseTasksUserInputValidation on EraseTasksUserInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => EraseTasksUserInputSchema.validate(toJson());
}

/// Validador de [EraseTasksUserResult] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class EraseTasksUserResultSchema {
  /// Errores de [json], o una lista vacía si cumple el contrato.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errores de [json] recibido del servidor (respuesta o mensaje).
  ///
  /// Igual que [validate], pero acepta valores de enum que este cliente
  /// no conoce dentro de una lista (por ejemplo un permiso nuevo):
  /// `fromJson` los descarta en lugar de fallar.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Agrega a [errors] los errores de [json] bajo [path].
  ///
  /// Con [acceptUnknownEnums], un valor de enum desconocido dentro de
  /// una lista no es un error.
  static void check(
    Object? json,
    String path,
    List<FieldError> errors, {
    bool acceptUnknownEnums = false,
  }) {
    if (json is! Map<String, Object?>) {
      addFieldError(errors, path, PlatformErrorCode.validationInvalidType.code);
      return;
    }
    if (json.containsKey('userId')) {
      final value66 = json['userId'];
      if (value66 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value66)) {
          addFieldError(
            errors,
            joinPath(path, 'userId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'userId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('affectedRows')) {
      final value67 = json['affectedRows'];
      if (value67 is! num ||
          !value67.isFinite ||
          value67 != value67.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'affectedRows'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value67 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'affectedRows'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value67 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'affectedRows'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'affectedRows'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [EraseTasksUserResult] contra su contrato.
extension EraseTasksUserResultValidation on EraseTasksUserResult {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => EraseTasksUserResultSchema.validate(toJson());
}
