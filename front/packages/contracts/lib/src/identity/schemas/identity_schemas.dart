// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../identity/types/identity_types.dart';
import '../../platform/enums/platform_enums.dart';

final _pattern0 = RegExp(
  '^(?:[A-Za-z0-9_\'+\\-]+\\.)*[A-Za-z0-9_\'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}\$',
);
final _pattern1 = RegExp(
  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))\$',
);
final _pattern2 = RegExp('^[A-Za-z0-9-]+\$');
final _pattern3 = RegExp('^[A-Za-z0-9_-]+\$');
final _pattern4 = RegExp(
  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})\$',
);

/// Validador de [SignInRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SignInRequestSchema {
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
    if (json.containsKey('email')) {
      final value0 = json['email'];
      if (value0 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value0.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern0.hasMatch(value0)) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'email'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('password')) {
      final value1 = json['password'];
      if (value1 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'password'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value1.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'password'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value1.length > 128) {
          addFieldError(
            errors,
            joinPath(path, 'password'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'password'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('deviceId')) {
      final value2 = json['deviceId'];
      if (value2 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value2.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value2.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'email', 'password', 'deviceId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [SignInRequest] contra su contrato.
extension SignInRequestValidation on SignInRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SignInRequestSchema.validate(toJson());
}

/// Validador de [SessionTokens] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SessionTokensSchema {
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
    if (json.containsKey('accessToken')) {
      final value3 = json['accessToken'];
      if (value3 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'accessToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value3.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'accessToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value3.length > 8192) {
          addFieldError(
            errors,
            joinPath(path, 'accessToken'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'accessToken'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('accessExpiresAt')) {
      final value4 = json['accessExpiresAt'];
      if (value4 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'accessExpiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value4)) {
          addFieldError(
            errors,
            joinPath(path, 'accessExpiresAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'accessExpiresAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('sessionToken')) {
      final value5 = json['sessionToken'];
      if (value5 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value5.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'sessionToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value5.length > 8192) {
          addFieldError(
            errors,
            joinPath(path, 'sessionToken'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
  }
}

/// Validación de [SessionTokens] contra su contrato.
extension SessionTokensValidation on SessionTokens {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SessionTokensSchema.validate(toJson());
}

/// Validador de [PendingMfa] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PendingMfaSchema {
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
    if (json.containsKey('mfaToken')) {
      final value6 = json['mfaToken'];
      if (value6 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value6.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value6.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'mfaToken'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('methods')) {
      final value7 = json['methods'];
      if (value7 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'methods'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value7.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'methods'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        for (var i8 = 0; i8 < value7.length; i8++) {
          final item9 = value7[i8];
          if (item9 is! String ||
              !const <String>{
                'device_otp',
                'email_otp',
                'totp',
                'recovery_code',
                'passkey',
              }.contains(item9)) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'methods'), '$i8'),
              PlatformErrorCode.validationInvalidEnum.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'methods'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [PendingMfa] contra su contrato.
extension PendingMfaValidation on PendingMfa {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => PendingMfaSchema.validate(toJson());
}

/// Validador de [SignInResponse] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SignInResponseSchema {
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
    if (json.containsKey('status')) {
      final value10 = json['status'];
      if (value10 is! String ||
          !const <String>{'authenticated', 'mfa_required'}.contains(value10)) {
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
    if (json.containsKey('tokens')) {
      final value11 = json['tokens'];
      SessionTokensSchema.check(value11, joinPath(path, 'tokens'), errors);
    }
    if (json.containsKey('mfa')) {
      final value12 = json['mfa'];
      PendingMfaSchema.check(value12, joinPath(path, 'mfa'), errors);
    }
  }
}

/// Validación de [SignInResponse] contra su contrato.
extension SignInResponseValidation on SignInResponse {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SignInResponseSchema.validate(toJson());
}

/// Validador de [MfaVerifyRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class MfaVerifyRequestSchema {
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
    if (json.containsKey('mfaToken')) {
      final value13 = json['mfaToken'];
      if (value13 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value13.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value13.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'mfaToken'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('method')) {
      final value14 = json['method'];
      if (value14 is! String ||
          !const <String>{
            'device_otp',
            'email_otp',
            'totp',
            'recovery_code',
            'passkey',
          }.contains(value14)) {
        addFieldError(
          errors,
          joinPath(path, 'method'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'method'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('code')) {
      final value15 = json['code'];
      if (value15 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value15.length < 6) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value15.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value15)) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationInvalidFormat.code,
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
    if (json.containsKey('devicePublicKey')) {
      final value16 = json['devicePublicKey'];
      if (value16 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'devicePublicKey'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value16.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value16.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value16)) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{
        'mfaToken',
        'method',
        'code',
        'devicePublicKey',
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

/// Validación de [MfaVerifyRequest] contra su contrato.
extension MfaVerifyRequestValidation on MfaVerifyRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => MfaVerifyRequestSchema.validate(toJson());
}

/// Validador de [SessionSummary] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SessionSummarySchema {
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
    if (json.containsKey('id')) {
      final value17 = json['id'];
      if (value17 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern4.hasMatch(value17)) {
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
    if (json.containsKey('deviceName')) {
      final value18 = json['deviceName'];
      if (value18 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value18.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value18.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'deviceName'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'deviceName'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('platform')) {
      final value19 = json['platform'];
      if (value19 is! String ||
          !const <String>{
            'ios',
            'android',
            'web',
            'macos',
            'windows',
            'linux',
          }.contains(value19)) {
        addFieldError(
          errors,
          joinPath(path, 'platform'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'platform'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('lastSeenAt')) {
      final value20 = json['lastSeenAt'];
      if (value20 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'lastSeenAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value20)) {
          addFieldError(
            errors,
            joinPath(path, 'lastSeenAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'lastSeenAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('current')) {
      final value21 = json['current'];
      if (value21 is! bool) {
        addFieldError(
          errors,
          joinPath(path, 'current'),
          PlatformErrorCode.validationInvalidType.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'current'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [SessionSummary] contra su contrato.
extension SessionSummaryValidation on SessionSummary {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SessionSummarySchema.validate(toJson());
}

/// Validador de [SessionPage] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SessionPageSchema {
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
    if (json.containsKey('items')) {
      final value22 = json['items'];
      if (value22 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value22.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i23 = 0; i23 < value22.length; i23++) {
          final item24 = value22[i23];
          SessionSummarySchema.check(
            item24,
            joinPath(joinPath(path, 'items'), '$i23'),
            errors,
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
      final value25 = json['nextCursor'];
      if (value25 != null) {
        if (value25 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value25.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value25.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value25)) {
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

/// Validación de [SessionPage] contra su contrato.
extension SessionPageValidation on SessionPage {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SessionPageSchema.validate(toJson());
}

/// Validador de [DeviceSummary] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class DeviceSummarySchema {
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
    if (json.containsKey('id')) {
      final value26 = json['id'];
      if (value26 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern4.hasMatch(value26)) {
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
    if (json.containsKey('name')) {
      final value27 = json['name'];
      if (value27 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value27.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value27.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'name'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('platform')) {
      final value28 = json['platform'];
      if (value28 is! String ||
          !const <String>{
            'ios',
            'android',
            'web',
            'macos',
            'windows',
            'linux',
          }.contains(value28)) {
        addFieldError(
          errors,
          joinPath(path, 'platform'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'platform'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('lastSeenAt')) {
      final value29 = json['lastSeenAt'];
      if (value29 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'lastSeenAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value29)) {
          addFieldError(
            errors,
            joinPath(path, 'lastSeenAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'lastSeenAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('trustedUntil')) {
      final value30 = json['trustedUntil'];
      if (value30 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'trustedUntil'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value30)) {
          addFieldError(
            errors,
            joinPath(path, 'trustedUntil'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    if (json.containsKey('verifier')) {
      final value31 = json['verifier'];
      if (value31 is! bool) {
        addFieldError(
          errors,
          joinPath(path, 'verifier'),
          PlatformErrorCode.validationInvalidType.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'verifier'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [DeviceSummary] contra su contrato.
extension DeviceSummaryValidation on DeviceSummary {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => DeviceSummarySchema.validate(toJson());
}

/// Validador de [DevicePage] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class DevicePageSchema {
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
    if (json.containsKey('items')) {
      final value32 = json['items'];
      if (value32 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value32.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i33 = 0; i33 < value32.length; i33++) {
          final item34 = value32[i33];
          DeviceSummarySchema.check(
            item34,
            joinPath(joinPath(path, 'items'), '$i33'),
            errors,
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
      final value35 = json['nextCursor'];
      if (value35 != null) {
        if (value35 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value35.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value35.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value35)) {
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

/// Validación de [DevicePage] contra su contrato.
extension DevicePageValidation on DevicePage {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => DevicePageSchema.validate(toJson());
}

/// Validador de [RevokeSessionRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class RevokeSessionRequestSchema {
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
    if (json.containsKey('sessionId')) {
      final value36 = json['sessionId'];
      if (value36 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern4.hasMatch(value36)) {
          addFieldError(
            errors,
            joinPath(path, 'sessionId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'sessionId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'sessionId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [RevokeSessionRequest] contra su contrato.
extension RevokeSessionRequestValidation on RevokeSessionRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => RevokeSessionRequestSchema.validate(toJson());
}

/// Validador de [RevokedSessions] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class RevokedSessionsSchema {
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
    if (json.containsKey('revoked')) {
      final value37 = json['revoked'];
      if (value37 is! num ||
          !value37.isFinite ||
          value37 != value37.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'revoked'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value37 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'revoked'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value37 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'revoked'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'revoked'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [RevokedSessions] contra su contrato.
extension RevokedSessionsValidation on RevokedSessions {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => RevokedSessionsSchema.validate(toJson());
}

/// Validador de [RevokeUserSessionsInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class RevokeUserSessionsInputSchema {
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
    if (json.containsKey('userId')) {
      final value38 = json['userId'];
      if (value38 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern4.hasMatch(value38)) {
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
    if (json.containsKey('reason')) {
      final value39 = json['reason'];
      if (value39 is! String ||
          !const <String>{
            'logout',
            'user_action',
            'password_changed',
            'admin_action',
            'compromised',
          }.contains(value39)) {
        addFieldError(
          errors,
          joinPath(path, 'reason'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'reason'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'userId', 'reason'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [RevokeUserSessionsInput] contra su contrato.
extension RevokeUserSessionsInputValidation on RevokeUserSessionsInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      RevokeUserSessionsInputSchema.validate(toJson());
}

/// Validador de [GetUserAccessInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class GetUserAccessInputSchema {
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
    if (json.containsKey('userId')) {
      final value40 = json['userId'];
      if (value40 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern4.hasMatch(value40)) {
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
    if (json.containsKey('tenantId')) {
      final value41 = json['tenantId'];
      if (value41 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern4.hasMatch(value41)) {
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
    for (final key in json.keys) {
      if (!const <String>{'userId', 'tenantId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [GetUserAccessInput] contra su contrato.
extension GetUserAccessInputValidation on GetUserAccessInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => GetUserAccessInputSchema.validate(toJson());
}

/// Validador de [UserAccess] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UserAccessSchema {
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
    if (json.containsKey('permissions')) {
      final value42 = json['permissions'];
      if (value42 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i43 = 0; i43 < value42.length; i43++) {
          final item44 = value42[i43];
          if (item44 is! String ||
              !const <String>{
                'tasks:read',
                'tasks:write',
                'billing:read',
                'backoffice:access',
              }.contains(item44)) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i43'),
              PlatformErrorCode.validationInvalidEnum.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'permissions'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('platformRoles')) {
      final value45 = json['platformRoles'];
      if (value45 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'platformRoles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i46 = 0; i46 < value45.length; i46++) {
          final item47 = value45[i46];
          if (item47 is! String ||
              !const <String>{
                'super_admin',
                'support',
                'finance',
                'read_only',
              }.contains(item47)) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'platformRoles'), '$i46'),
              PlatformErrorCode.validationInvalidEnum.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'platformRoles'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('features')) {
      final value48 = json['features'];
      if (value48 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'features'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i49 = 0; i49 < value48.length; i49++) {
          final item50 = value48[i49];
          if (item50 is! String ||
              !const <String>{
                'ai_assistant',
                'webhooks',
                'billing',
              }.contains(item50)) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'features'), '$i49'),
              PlatformErrorCode.validationInvalidEnum.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'features'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('flags')) {
      final value51 = json['flags'];
      if (value51 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'flags'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i52 = 0; i52 < value51.length; i52++) {
          final item53 = value51[i52];
          if (item53 is! String ||
              !const <String>{'new_reports'}.contains(item53)) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'flags'), '$i52'),
              PlatformErrorCode.validationInvalidEnum.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'flags'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [UserAccess] contra su contrato.
extension UserAccessValidation on UserAccess {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => UserAccessSchema.validate(toJson());
}

/// Validador de [SessionRevokedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SessionRevokedPayloadSchema {
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
    if (json.containsKey('sessionId')) {
      final value54 = json['sessionId'];
      if (value54 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern4.hasMatch(value54)) {
          addFieldError(
            errors,
            joinPath(path, 'sessionId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'sessionId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('userId')) {
      final value55 = json['userId'];
      if (value55 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern4.hasMatch(value55)) {
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
    if (json.containsKey('tenantId')) {
      final value56 = json['tenantId'];
      if (value56 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern4.hasMatch(value56)) {
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
    if (json.containsKey('reason')) {
      final value57 = json['reason'];
      if (value57 is! String ||
          !const <String>{
            'logout',
            'user_action',
            'password_changed',
            'admin_action',
            'compromised',
          }.contains(value57)) {
        addFieldError(
          errors,
          joinPath(path, 'reason'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'reason'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('revokedAt')) {
      final value58 = json['revokedAt'];
      if (value58 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'revokedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value58)) {
          addFieldError(
            errors,
            joinPath(path, 'revokedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'revokedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [SessionRevokedPayload] contra su contrato.
extension SessionRevokedPayloadValidation on SessionRevokedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SessionRevokedPayloadSchema.validate(toJson());
}

/// Validador de [TokensRevokedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TokensRevokedPayloadSchema {
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
    if (json.containsKey('scope')) {
      final value59 = json['scope'];
      if (value59 is! String ||
          !const <String>{'session', 'user', 'tenant'}.contains(value59)) {
        addFieldError(
          errors,
          joinPath(path, 'scope'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'scope'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('subjectId')) {
      final value60 = json['subjectId'];
      if (value60 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'subjectId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern4.hasMatch(value60)) {
          addFieldError(
            errors,
            joinPath(path, 'subjectId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'subjectId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('revokedBefore')) {
      final value61 = json['revokedBefore'];
      if (value61 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'revokedBefore'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value61)) {
          addFieldError(
            errors,
            joinPath(path, 'revokedBefore'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'revokedBefore'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TokensRevokedPayload] contra su contrato.
extension TokensRevokedPayloadValidation on TokensRevokedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TokensRevokedPayloadSchema.validate(toJson());
}
