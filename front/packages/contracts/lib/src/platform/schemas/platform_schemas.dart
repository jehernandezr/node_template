// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';
import '../../platform/types/platform_types.dart';

final _pattern0 = RegExp('^[A-Za-z0-9_-]+\$');
final _pattern1 = RegExp('^[A-Z]{3}\$');
final _pattern2 = RegExp(
  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})\$',
);

/// Validador de [PageQuery] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PageQuerySchema {
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
    if (json.containsKey('limit')) {
      final value0 = json['limit'];
      if (value0 is! num ||
          !value0.isFinite ||
          value0 != value0.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'limit'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value0 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value0 > 100) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    }
    if (json.containsKey('after')) {
      final value1 = json['after'];
      if (value1 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'after'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value1.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value1.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern0.hasMatch(value1)) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'limit', 'after'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [PageQuery] contra su contrato.
extension PageQueryValidation on PageQuery {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => PageQuerySchema.validate(toJson());
}

/// Validador de [MoneyAmount] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class MoneyAmountSchema {
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
    if (json.containsKey('amountMinor')) {
      final value2 = json['amountMinor'];
      if (value2 is! num ||
          !value2.isFinite ||
          value2 != value2.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'amountMinor'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value2 < -9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'amountMinor'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value2 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'amountMinor'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'amountMinor'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('currency')) {
      final value3 = json['currency'];
      if (value3 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'currency'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value3)) {
          addFieldError(
            errors,
            joinPath(path, 'currency'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'currency'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [MoneyAmount] contra su contrato.
extension MoneyAmountValidation on MoneyAmount {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => MoneyAmountSchema.validate(toJson());
}

/// Validador de [FieldError] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class FieldErrorSchema {
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
    if (json.containsKey('field')) {
      final value4 = json['field'];
      if (value4 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'field'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value4.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'field'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('code')) {
      final value5 = json['code'];
      if (value5 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value5.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value5.length > 128) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'code'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('message')) {
      final value6 = json['message'];
      if (value6 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'message'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value6.length > 1024) {
          addFieldError(
            errors,
            joinPath(path, 'message'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
  }
}

/// Validador de [ProblemDetails] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ProblemDetailsSchema {
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
      final value7 = json['type'];
      if (value7 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'type'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value7.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'type'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'type'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('title')) {
      final value8 = json['title'];
      if (value8 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'title'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {}
    } else {
      addFieldError(
        errors,
        joinPath(path, 'title'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value9 = json['status'];
      if (value9 is! num ||
          !value9.isFinite ||
          value9 != value9.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'status'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value9 < 400) {
          addFieldError(
            errors,
            joinPath(path, 'status'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value9 > 599) {
          addFieldError(
            errors,
            joinPath(path, 'status'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'status'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('detail')) {
      final value10 = json['detail'];
      if (value10 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'detail'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {}
    }
    if (json.containsKey('instance')) {
      final value11 = json['instance'];
      if (value11 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'instance'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {}
    }
    if (json.containsKey('code')) {
      final value12 = json['code'];
      if (value12 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value12.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value12.length > 128) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'code'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('traceId')) {
      final value13 = json['traceId'];
      if (value13 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'traceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {}
    }
    if (json.containsKey('errors')) {
      final value14 = json['errors'];
      if (value14 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'errors'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i15 = 0; i15 < value14.length; i15++) {
          final item16 = value14[i15];
          FieldErrorSchema.check(
            item16,
            joinPath(joinPath(path, 'errors'), '$i15'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    }
    if (json.containsKey('details')) {
      final value17 = json['details'];
      ProblemDetailsDetailsSchema.check(
        value17,
        joinPath(path, 'details'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    }
  }
}

/// Validador de [Empty] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class EmptySchema {
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
    for (final key in json.keys) {
      if (!const <String>{}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [Empty] contra su contrato.
extension EmptyValidation on Empty {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => EmptySchema.validate(toJson());
}

/// Validador de [UserRef] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UserRefSchema {
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
      final value18 = json['userId'];
      if (value18 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value18)) {
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
    if (json.containsKey('homeTenantId')) {
      final value19 = json['homeTenantId'];
      if (value19 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'homeTenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value19)) {
          addFieldError(
            errors,
            joinPath(path, 'homeTenantId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'homeTenantId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [UserRef] contra su contrato.
extension UserRefValidation on UserRef {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => UserRefSchema.validate(toJson());
}

/// Validador de [TenantMoveRef] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TenantMoveRefSchema {
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
    if (json.containsKey('moveId')) {
      final value20 = json['moveId'];
      if (value20 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'moveId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value20)) {
          addFieldError(
            errors,
            joinPath(path, 'moveId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'moveId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('tenantId')) {
      final value21 = json['tenantId'];
      if (value21 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value21)) {
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
    if (json.containsKey('targetGroup')) {
      final value22 = json['targetGroup'];
      if (value22 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'targetGroup'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value22.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'targetGroup'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value22.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'targetGroup'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'targetGroup'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('targetRegion')) {
      final value23 = json['targetRegion'];
      if (value23 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'targetRegion'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value23.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'targetRegion'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value23.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'targetRegion'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'targetRegion'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{
        'moveId',
        'tenantId',
        'targetGroup',
        'targetRegion',
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

/// Validación de [TenantMoveRef] contra su contrato.
extension TenantMoveRefValidation on TenantMoveRef {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TenantMoveRefSchema.validate(toJson());
}

/// Validador de [TenantMoveTableProgress] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TenantMoveTableProgressSchema {
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
    if (json.containsKey('table')) {
      final value24 = json['table'];
      if (value24 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'table'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value24.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'table'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value24.length > 63) {
          addFieldError(
            errors,
            joinPath(path, 'table'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'table'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('copiedRows')) {
      final value25 = json['copiedRows'];
      if (value25 is! num ||
          !value25.isFinite ||
          value25 != value25.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'copiedRows'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value25 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'copiedRows'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value25 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'copiedRows'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'copiedRows'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('pendingRows')) {
      final value26 = json['pendingRows'];
      if (value26 is! num ||
          !value26.isFinite ||
          value26 != value26.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'pendingRows'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value26 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'pendingRows'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value26 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'pendingRows'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'pendingRows'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TenantMoveTableProgress] contra su contrato.
extension TenantMoveTableProgressValidation on TenantMoveTableProgress {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      TenantMoveTableProgressSchema.validate(toJson());
}

/// Validador de [TenantMoveProgress] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TenantMoveProgressSchema {
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
    if (json.containsKey('tables')) {
      final value27 = json['tables'];
      if (value27 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'tables'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value27.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'tables'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i28 = 0; i28 < value27.length; i28++) {
          final item29 = value27[i28];
          TenantMoveTableProgressSchema.check(
            item29,
            joinPath(joinPath(path, 'tables'), '$i28'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'tables'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('caughtUp')) {
      final value30 = json['caughtUp'];
      if (value30 is! bool) {
        addFieldError(
          errors,
          joinPath(path, 'caughtUp'),
          PlatformErrorCode.validationInvalidType.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'caughtUp'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TenantMoveProgress] contra su contrato.
extension TenantMoveProgressValidation on TenantMoveProgress {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TenantMoveProgressSchema.validate(toJson());
}

/// Validador de [TenantMoveTableCheck] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TenantMoveTableCheckSchema {
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
    if (json.containsKey('table')) {
      final value31 = json['table'];
      if (value31 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'table'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value31.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'table'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value31.length > 63) {
          addFieldError(
            errors,
            joinPath(path, 'table'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'table'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('sourceRows')) {
      final value32 = json['sourceRows'];
      if (value32 is! num ||
          !value32.isFinite ||
          value32 != value32.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'sourceRows'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value32 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'sourceRows'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value32 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'sourceRows'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'sourceRows'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('targetRows')) {
      final value33 = json['targetRows'];
      if (value33 is! num ||
          !value33.isFinite ||
          value33 != value33.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'targetRows'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value33 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'targetRows'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value33 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'targetRows'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'targetRows'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('sourceChecksum')) {
      final value34 = json['sourceChecksum'];
      if (value34 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sourceChecksum'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value34.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'sourceChecksum'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value34.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'sourceChecksum'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'sourceChecksum'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('targetChecksum')) {
      final value35 = json['targetChecksum'];
      if (value35 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'targetChecksum'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value35.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'targetChecksum'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value35.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'targetChecksum'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'targetChecksum'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TenantMoveTableCheck] contra su contrato.
extension TenantMoveTableCheckValidation on TenantMoveTableCheck {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TenantMoveTableCheckSchema.validate(toJson());
}

/// Validador de [TenantMoveVerification] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TenantMoveVerificationSchema {
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
    if (json.containsKey('verified')) {
      final value36 = json['verified'];
      if (value36 is! bool) {
        addFieldError(
          errors,
          joinPath(path, 'verified'),
          PlatformErrorCode.validationInvalidType.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'verified'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('tables')) {
      final value37 = json['tables'];
      if (value37 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'tables'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value37.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'tables'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i38 = 0; i38 < value37.length; i38++) {
          final item39 = value37[i38];
          TenantMoveTableCheckSchema.check(
            item39,
            joinPath(joinPath(path, 'tables'), '$i38'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'tables'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TenantMoveVerification] contra su contrato.
extension TenantMoveVerificationValidation on TenantMoveVerification {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      TenantMoveVerificationSchema.validate(toJson());
}

/// Validador de [TenantMoveAck] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TenantMoveAckSchema {
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
    if (json.containsKey('moveId')) {
      final value40 = json['moveId'];
      if (value40 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'moveId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value40)) {
          addFieldError(
            errors,
            joinPath(path, 'moveId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'moveId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TenantMoveAck] contra su contrato.
extension TenantMoveAckValidation on TenantMoveAck {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TenantMoveAckSchema.validate(toJson());
}

/// Validador de [ProblemDetailsDetails] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ProblemDetailsDetailsSchema {
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
    if (json.containsKey('apiBaseUrl')) {
      final value41 = json['apiBaseUrl'];
      if (value41 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiBaseUrl'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value41.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'apiBaseUrl'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('region')) {
      final value42 = json['region'];
      if (value42 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value42.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
  }
}

/// Validación de [ProblemDetailsDetails] contra su contrato.
extension ProblemDetailsDetailsValidation on ProblemDetailsDetails {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => ProblemDetailsDetailsSchema.validate(toJson());
}
