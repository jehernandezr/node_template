// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../notifications/types/notifications_types.dart';
import '../../platform/enums/platform_enums.dart';
import '../../platform/schemas/platform_schemas.dart';

final _pattern0 = RegExp(
  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})\$',
);
final _pattern1 = RegExp(
  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))\$',
);
final _pattern2 = RegExp('^[A-Za-z0-9_-]+\$');
final _pattern3 = RegExp('^([01]\\d|2[0-3]):[0-5]\\d\$');
final _pattern4 = RegExp(
  '^(?:[A-Za-z0-9_\'+\\-]+\\.)*[A-Za-z0-9_\'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}\$',
);

/// Validador de [NotificationCreatedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class NotificationCreatedPayloadSchema {
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
    if (json.containsKey('notificationId')) {
      final value0 = json['notificationId'];
      if (value0 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'notificationId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value0)) {
          addFieldError(
            errors,
            joinPath(path, 'notificationId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'notificationId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('tenantId')) {
      final value1 = json['tenantId'];
      if (value1 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value1)) {
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
    if (json.containsKey('type')) {
      final value2 = json['type'];
      if (value2 is! String ||
          !const <String>{
            'security_alert',
            'task_updated',
            'invoice_issued',
            'account_activity',
          }.contains(value2)) {
        addFieldError(
          errors,
          joinPath(path, 'type'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'type'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('channels')) {
      final value3 = json['channels'];
      if (value3 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'channels'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value3.length > 3) {
          addFieldError(
            errors,
            joinPath(path, 'channels'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i4 = 0; i4 < value3.length; i4++) {
          final item5 = value3[i4];
          if (item5 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{'in_app', 'push', 'email'}.contains(item5))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'channels'), '$i4'),
              PlatformErrorCode.validationInvalidEnum.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'channels'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdAt')) {
      final value6 = json['createdAt'];
      if (value6 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value6)) {
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

/// Validación de [NotificationCreatedPayload] contra su contrato.
extension NotificationCreatedPayloadValidation on NotificationCreatedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      NotificationCreatedPayloadSchema.validate(toJson());
}

/// Validador de [AppNotification] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class AppNotificationSchema {
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
      final value7 = json['id'];
      if (value7 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value7)) {
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
    if (json.containsKey('type')) {
      final value8 = json['type'];
      if (value8 is! String ||
          !const <String>{
            'security_alert',
            'task_updated',
            'invoice_issued',
            'account_activity',
          }.contains(value8)) {
        addFieldError(
          errors,
          joinPath(path, 'type'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'type'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('title')) {
      final value9 = json['title'];
      if (value9 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'title'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value9.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'title'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value9.length > 200) {
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
    if (json.containsKey('body')) {
      final value10 = json['body'];
      if (value10 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'body'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value10.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'body'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value10.length > 1000) {
          addFieldError(
            errors,
            joinPath(path, 'body'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'body'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdAt')) {
      final value11 = json['createdAt'];
      if (value11 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value11)) {
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
    if (json.containsKey('read')) {
      final value12 = json['read'];
      if (value12 is! bool) {
        addFieldError(
          errors,
          joinPath(path, 'read'),
          PlatformErrorCode.validationInvalidType.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'read'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [AppNotification] contra su contrato.
extension AppNotificationValidation on AppNotification {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => AppNotificationSchema.validate(toJson());
}

/// Validador de [NotificationPage] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class NotificationPageSchema {
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
      final value13 = json['items'];
      if (value13 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value13.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i14 = 0; i14 < value13.length; i14++) {
          final item15 = value13[i14];
          AppNotificationSchema.check(
            item15,
            joinPath(joinPath(path, 'items'), '$i14'),
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
      final value16 = json['nextCursor'];
      if (value16 != null) {
        if (value16 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value16.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value16.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern2.hasMatch(value16)) {
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

/// Validación de [NotificationPage] contra su contrato.
extension NotificationPageValidation on NotificationPage {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => NotificationPageSchema.validate(toJson());
}

/// Validador de [UnreadCount] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UnreadCountSchema {
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
    if (json.containsKey('count')) {
      final value17 = json['count'];
      if (value17 is! num ||
          !value17.isFinite ||
          value17 != value17.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'count'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value17 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'count'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value17 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'count'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'count'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [UnreadCount] contra su contrato.
extension UnreadCountValidation on UnreadCount {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => UnreadCountSchema.validate(toJson());
}

/// Validador de [MarkNotificationReadRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class MarkNotificationReadRequestSchema {
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
    if (json.containsKey('notificationId')) {
      final value18 = json['notificationId'];
      if (value18 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'notificationId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value18)) {
          addFieldError(
            errors,
            joinPath(path, 'notificationId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'notificationId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'notificationId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [MarkNotificationReadRequest] contra su contrato.
extension MarkNotificationReadRequestValidation on MarkNotificationReadRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      MarkNotificationReadRequestSchema.validate(toJson());
}

/// Validador de [NotificationPreferenceEntry] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class NotificationPreferenceEntrySchema {
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
    if (json.containsKey('type')) {
      final value19 = json['type'];
      if (value19 is! String ||
          !const <String>{
            'security_alert',
            'task_updated',
            'invoice_issued',
            'account_activity',
          }.contains(value19)) {
        addFieldError(
          errors,
          joinPath(path, 'type'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'type'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('channels')) {
      final value20 = json['channels'];
      if (value20 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'channels'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value20.length > 3) {
          addFieldError(
            errors,
            joinPath(path, 'channels'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i21 = 0; i21 < value20.length; i21++) {
          final item22 = value20[i21];
          if (item22 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'in_app',
                    'push',
                    'email',
                  }.contains(item22))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'channels'), '$i21'),
              PlatformErrorCode.validationInvalidEnum.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'channels'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [NotificationPreferenceEntry] contra su contrato.
extension NotificationPreferenceEntryValidation on NotificationPreferenceEntry {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      NotificationPreferenceEntrySchema.validate(toJson());
}

/// Validador de [NotificationPreferences] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class NotificationPreferencesSchema {
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
    if (json.containsKey('enabled')) {
      final value23 = json['enabled'];
      if (value23 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'enabled'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value23.length > 4) {
          addFieldError(
            errors,
            joinPath(path, 'enabled'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i24 = 0; i24 < value23.length; i24++) {
          final item25 = value23[i24];
          NotificationPreferenceEntrySchema.check(
            item25,
            joinPath(joinPath(path, 'enabled'), '$i24'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'enabled'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('quietStart')) {
      final value26 = json['quietStart'];
      if (value26 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'quietStart'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value26.length < 5) {
          addFieldError(
            errors,
            joinPath(path, 'quietStart'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value26.length > 5) {
          addFieldError(
            errors,
            joinPath(path, 'quietStart'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value26)) {
          addFieldError(
            errors,
            joinPath(path, 'quietStart'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'quietStart'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('quietEnd')) {
      final value27 = json['quietEnd'];
      if (value27 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'quietEnd'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value27.length < 5) {
          addFieldError(
            errors,
            joinPath(path, 'quietEnd'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value27.length > 5) {
          addFieldError(
            errors,
            joinPath(path, 'quietEnd'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value27)) {
          addFieldError(
            errors,
            joinPath(path, 'quietEnd'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'quietEnd'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('timezone')) {
      final value28 = json['timezone'];
      if (value28 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'timezone'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value28.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'timezone'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value28.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'timezone'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'timezone'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{
        'enabled',
        'quietStart',
        'quietEnd',
        'timezone',
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

/// Validación de [NotificationPreferences] contra su contrato.
extension NotificationPreferencesValidation on NotificationPreferences {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      NotificationPreferencesSchema.validate(toJson());
}

/// Validador de [TemplateParameterValue] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TemplateParameterValueSchema {
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
    if (json.containsKey('name')) {
      final value29 = json['name'];
      if (value29 is! String ||
          !const <String>{
            'code',
            'link',
            'display_name',
            'tenant_name',
            'reference',
            'available_at',
          }.contains(value29)) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'name'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('value')) {
      final value30 = json['value'];
      if (value30 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'value'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value30.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'value'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value30.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'value'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'value'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'name', 'value'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [TemplateParameterValue] contra su contrato.
extension TemplateParameterValueValidation on TemplateParameterValue {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      TemplateParameterValueSchema.validate(toJson());
}

/// Validador de [SendEmailInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SendEmailInputSchema {
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
    if (json.containsKey('messageId')) {
      final value31 = json['messageId'];
      if (value31 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'messageId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value31)) {
          addFieldError(
            errors,
            joinPath(path, 'messageId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'messageId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('template')) {
      final value32 = json['template'];
      if (value32 is! String ||
          !const <String>{
            'verify_email',
            'password_reset',
            'mfa_code',
            'email_change',
            'invitation',
            'email_already_registered',
            'mfa_recovery',
          }.contains(value32)) {
        addFieldError(
          errors,
          joinPath(path, 'template'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'template'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('to')) {
      final value33 = json['to'];
      if (value33 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'to'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value33.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'to'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern4.hasMatch(value33)) {
          addFieldError(
            errors,
            joinPath(path, 'to'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'to'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('locale')) {
      final value34 = json['locale'];
      if (value34 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'locale'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value34.length < 2) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value34.length > 35) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('parameters')) {
      final value35 = json['parameters'];
      if (value35 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'parameters'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value35.length > 10) {
          addFieldError(
            errors,
            joinPath(path, 'parameters'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i36 = 0; i36 < value35.length; i36++) {
          final item37 = value35[i36];
          TemplateParameterValueSchema.check(
            item37,
            joinPath(joinPath(path, 'parameters'), '$i36'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'parameters'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{
        'messageId',
        'template',
        'to',
        'locale',
        'parameters',
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

/// Validación de [SendEmailInput] contra su contrato.
extension SendEmailInputValidation on SendEmailInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SendEmailInputSchema.validate(toJson());
}

/// Validador de [SendEmailResult] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SendEmailResultSchema {
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
    if (json.containsKey('messageId')) {
      final value38 = json['messageId'];
      if (value38 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'messageId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value38)) {
          addFieldError(
            errors,
            joinPath(path, 'messageId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'messageId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [SendEmailResult] contra su contrato.
extension SendEmailResultValidation on SendEmailResult {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SendEmailResultSchema.validate(toJson());
}

/// Validador de [NotifyUserInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class NotifyUserInputSchema {
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
    if (json.containsKey('notificationId')) {
      final value39 = json['notificationId'];
      if (value39 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'notificationId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value39)) {
          addFieldError(
            errors,
            joinPath(path, 'notificationId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'notificationId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('user')) {
      final value40 = json['user'];
      UserRefSchema.check(
        value40,
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
    if (json.containsKey('tenantId')) {
      final value41 = json['tenantId'];
      if (value41 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value41)) {
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
    if (json.containsKey('type')) {
      final value42 = json['type'];
      if (value42 is! String ||
          !const <String>{
            'security_alert',
            'task_updated',
            'invoice_issued',
            'account_activity',
          }.contains(value42)) {
        addFieldError(
          errors,
          joinPath(path, 'type'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'type'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('parameters')) {
      final value43 = json['parameters'];
      if (value43 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'parameters'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value43.length > 10) {
          addFieldError(
            errors,
            joinPath(path, 'parameters'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i44 = 0; i44 < value43.length; i44++) {
          final item45 = value43[i44];
          TemplateParameterValueSchema.check(
            item45,
            joinPath(joinPath(path, 'parameters'), '$i44'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'parameters'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{
        'notificationId',
        'user',
        'tenantId',
        'type',
        'parameters',
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

/// Validación de [NotifyUserInput] contra su contrato.
extension NotifyUserInputValidation on NotifyUserInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => NotifyUserInputSchema.validate(toJson());
}

/// Validador de [NotifyUserResult] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class NotifyUserResultSchema {
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
    if (json.containsKey('notificationId')) {
      final value46 = json['notificationId'];
      if (value46 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'notificationId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value46)) {
          addFieldError(
            errors,
            joinPath(path, 'notificationId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'notificationId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('channels')) {
      final value47 = json['channels'];
      if (value47 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'channels'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value47.length > 3) {
          addFieldError(
            errors,
            joinPath(path, 'channels'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i48 = 0; i48 < value47.length; i48++) {
          final item49 = value47[i48];
          if (item49 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'in_app',
                    'push',
                    'email',
                  }.contains(item49))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'channels'), '$i48'),
              PlatformErrorCode.validationInvalidEnum.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'channels'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [NotifyUserResult] contra su contrato.
extension NotifyUserResultValidation on NotifyUserResult {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => NotifyUserResultSchema.validate(toJson());
}

/// Validador de [EraseNotificationsUserInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class EraseNotificationsUserInputSchema {
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
      final value50 = json['user'];
      UserRefSchema.check(
        value50,
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

/// Validación de [EraseNotificationsUserInput] contra su contrato.
extension EraseNotificationsUserInputValidation on EraseNotificationsUserInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      EraseNotificationsUserInputSchema.validate(toJson());
}

/// Validador de [EraseNotificationsUserResult] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class EraseNotificationsUserResultSchema {
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
      final value51 = json['userId'];
      if (value51 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value51)) {
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
      final value52 = json['affectedRows'];
      if (value52 is! num ||
          !value52.isFinite ||
          value52 != value52.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'affectedRows'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value52 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'affectedRows'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value52 > 9007199254740991) {
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

/// Validación de [EraseNotificationsUserResult] contra su contrato.
extension EraseNotificationsUserResultValidation
    on EraseNotificationsUserResult {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      EraseNotificationsUserResultSchema.validate(toJson());
}
