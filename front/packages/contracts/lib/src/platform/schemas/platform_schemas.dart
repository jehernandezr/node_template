// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';
import '../../platform/types/platform_types.dart';

final _pattern0 = RegExp('^[A-Za-z0-9_-]+\$');
final _pattern1 = RegExp('^[A-Z]{3}\$');

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

  /// Agrega a [errors] los errores de [json] bajo [path].
  static void check(Object? json, String path, List<FieldError> errors) {
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

  /// Agrega a [errors] los errores de [json] bajo [path].
  static void check(Object? json, String path, List<FieldError> errors) {
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

  /// Agrega a [errors] los errores de [json] bajo [path].
  static void check(Object? json, String path, List<FieldError> errors) {
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

  /// Agrega a [errors] los errores de [json] bajo [path].
  static void check(Object? json, String path, List<FieldError> errors) {
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
          );
        }
      }
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

  /// Agrega a [errors] los errores de [json] bajo [path].
  static void check(Object? json, String path, List<FieldError> errors) {
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
