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
final _pattern2 = RegExp(
  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})\$',
);
final _pattern3 = RegExp('^[A-Za-z0-9-]+\$');
final _pattern4 = RegExp('^[A-Za-z0-9_-]+\$');

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

/// Validador de [MfaChallengeRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class MfaChallengeRequestSchema {
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
    for (final key in json.keys) {
      if (!const <String>{'mfaToken', 'method'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [MfaChallengeRequest] contra su contrato.
extension MfaChallengeRequestValidation on MfaChallengeRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => MfaChallengeRequestSchema.validate(toJson());
}

/// Validador de [MfaChallenge] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class MfaChallengeSchema {
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
    if (json.containsKey('challengeId')) {
      final value15 = json['challengeId'];
      if (value15 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value15)) {
          addFieldError(
            errors,
            joinPath(path, 'challengeId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'challengeId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('method')) {
      final value16 = json['method'];
      if (value16 is! String ||
          !const <String>{
            'device_otp',
            'email_otp',
            'totp',
            'recovery_code',
            'passkey',
          }.contains(value16)) {
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
    if (json.containsKey('expiresAt')) {
      final value17 = json['expiresAt'];
      if (value17 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'expiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value17)) {
          addFieldError(
            errors,
            joinPath(path, 'expiresAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'expiresAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('codeLength')) {
      final value18 = json['codeLength'];
      if (value18 is! num ||
          !value18.isFinite ||
          value18 != value18.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'codeLength'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value18 < 6) {
          addFieldError(
            errors,
            joinPath(path, 'codeLength'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value18 > 64) {
          addFieldError(
            errors,
            joinPath(path, 'codeLength'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    }
  }
}

/// Validación de [MfaChallenge] contra su contrato.
extension MfaChallengeValidation on MfaChallenge {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => MfaChallengeSchema.validate(toJson());
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
      final value19 = json['mfaToken'];
      if (value19 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value19.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value19.length > 2048) {
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
    if (json.containsKey('challengeId')) {
      final value20 = json['challengeId'];
      if (value20 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value20)) {
          addFieldError(
            errors,
            joinPath(path, 'challengeId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'challengeId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('code')) {
      final value21 = json['code'];
      if (value21 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value21.length < 6) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value21.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value21)) {
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
      final value22 = json['devicePublicKey'];
      if (value22 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'devicePublicKey'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value22.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value22.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern4.hasMatch(value22)) {
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
        'challengeId',
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
      final value23 = json['id'];
      if (value23 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value23)) {
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
      final value24 = json['deviceName'];
      if (value24 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value24.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value24.length > 120) {
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
      final value25 = json['platform'];
      if (value25 is! String ||
          !const <String>{
            'ios',
            'android',
            'web',
            'macos',
            'windows',
            'linux',
          }.contains(value25)) {
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
      final value26 = json['lastSeenAt'];
      if (value26 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'lastSeenAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value26)) {
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
      final value27 = json['current'];
      if (value27 is! bool) {
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
      final value28 = json['items'];
      if (value28 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value28.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i29 = 0; i29 < value28.length; i29++) {
          final item30 = value28[i29];
          SessionSummarySchema.check(
            item30,
            joinPath(joinPath(path, 'items'), '$i29'),
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
      final value31 = json['nextCursor'];
      if (value31 != null) {
        if (value31 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value31.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value31.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern4.hasMatch(value31)) {
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
      final value32 = json['id'];
      if (value32 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value32)) {
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
      final value33 = json['name'];
      if (value33 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value33.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value33.length > 120) {
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
      final value34 = json['platform'];
      if (value34 is! String ||
          !const <String>{
            'ios',
            'android',
            'web',
            'macos',
            'windows',
            'linux',
          }.contains(value34)) {
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
      final value35 = json['lastSeenAt'];
      if (value35 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'lastSeenAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value35)) {
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
      final value36 = json['trustedUntil'];
      if (value36 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'trustedUntil'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value36)) {
          addFieldError(
            errors,
            joinPath(path, 'trustedUntil'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    if (json.containsKey('verifier')) {
      final value37 = json['verifier'];
      if (value37 is! bool) {
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
      final value38 = json['items'];
      if (value38 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value38.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i39 = 0; i39 < value38.length; i39++) {
          final item40 = value38[i39];
          DeviceSummarySchema.check(
            item40,
            joinPath(joinPath(path, 'items'), '$i39'),
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
      final value41 = json['nextCursor'];
      if (value41 != null) {
        if (value41 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value41.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value41.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern4.hasMatch(value41)) {
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
      final value42 = json['sessionId'];
      if (value42 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value42)) {
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
      final value43 = json['revoked'];
      if (value43 is! num ||
          !value43.isFinite ||
          value43 != value43.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'revoked'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value43 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'revoked'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value43 > 9007199254740991) {
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
      final value44 = json['userId'];
      if (value44 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value44)) {
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
      final value45 = json['reason'];
      if (value45 is! String ||
          !const <String>{
            'logout',
            'user_action',
            'password_changed',
            'admin_action',
            'compromised',
          }.contains(value45)) {
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
      final value46 = json['userId'];
      if (value46 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value46)) {
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
      final value47 = json['tenantId'];
      if (value47 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value47)) {
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
      final value48 = json['permissions'];
      if (value48 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i49 = 0; i49 < value48.length; i49++) {
          final item50 = value48[i49];
          if (item50 is! String ||
              !const <String>{
                'tasks:read',
                'tasks:write',
                'billing:read',
                'billing:write',
                'backoffice:access',
              }.contains(item50)) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i49'),
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
      final value51 = json['platformRoles'];
      if (value51 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'platformRoles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i52 = 0; i52 < value51.length; i52++) {
          final item53 = value51[i52];
          if (item53 is! String ||
              !const <String>{
                'super_admin',
                'support',
                'finance',
                'read_only',
              }.contains(item53)) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'platformRoles'), '$i52'),
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
      final value54 = json['features'];
      if (value54 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'features'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i55 = 0; i55 < value54.length; i55++) {
          final item56 = value54[i55];
          if (item56 is! String ||
              !const <String>{
                'ai_assistant',
                'webhooks',
                'billing',
              }.contains(item56)) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'features'), '$i55'),
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
      final value57 = json['flags'];
      if (value57 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'flags'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i58 = 0; i58 < value57.length; i58++) {
          final item59 = value57[i58];
          if (item59 is! String ||
              !const <String>{'new_reports'}.contains(item59)) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'flags'), '$i58'),
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

/// Validador de [SessionAccess] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SessionAccessSchema {
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
      final value60 = json['userId'];
      if (value60 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value60)) {
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
      final value61 = json['tenantId'];
      if (value61 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value61)) {
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
    if (json.containsKey('sessionId')) {
      final value62 = json['sessionId'];
      if (value62 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value62)) {
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
    if (json.containsKey('permissions')) {
      final value63 = json['permissions'];
      if (value63 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i64 = 0; i64 < value63.length; i64++) {
          final item65 = value63[i64];
          if (item65 is! String ||
              !const <String>{
                'tasks:read',
                'tasks:write',
                'billing:read',
                'billing:write',
                'backoffice:access',
              }.contains(item65)) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i64'),
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
      final value66 = json['platformRoles'];
      if (value66 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'platformRoles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i67 = 0; i67 < value66.length; i67++) {
          final item68 = value66[i67];
          if (item68 is! String ||
              !const <String>{
                'super_admin',
                'support',
                'finance',
                'read_only',
              }.contains(item68)) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'platformRoles'), '$i67'),
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
      final value69 = json['features'];
      if (value69 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'features'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i70 = 0; i70 < value69.length; i70++) {
          final item71 = value69[i70];
          if (item71 is! String ||
              !const <String>{
                'ai_assistant',
                'webhooks',
                'billing',
              }.contains(item71)) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'features'), '$i70'),
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
      final value72 = json['flags'];
      if (value72 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'flags'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i73 = 0; i73 < value72.length; i73++) {
          final item74 = value72[i73];
          if (item74 is! String ||
              !const <String>{'new_reports'}.contains(item74)) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'flags'), '$i73'),
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
    if (json.containsKey('mfaVerifiedAt')) {
      final value75 = json['mfaVerifiedAt'];
      if (value75 != null) {
        if (value75 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'mfaVerifiedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern1.hasMatch(value75)) {
            addFieldError(
              errors,
              joinPath(path, 'mfaVerifiedAt'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'mfaVerifiedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [SessionAccess] contra su contrato.
extension SessionAccessValidation on SessionAccess {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SessionAccessSchema.validate(toJson());
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
      final value76 = json['sessionId'];
      if (value76 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value76)) {
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
      final value77 = json['userId'];
      if (value77 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value77)) {
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
      final value78 = json['tenantId'];
      if (value78 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value78)) {
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
      final value79 = json['reason'];
      if (value79 is! String ||
          !const <String>{
            'logout',
            'user_action',
            'password_changed',
            'admin_action',
            'compromised',
          }.contains(value79)) {
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
      final value80 = json['revokedAt'];
      if (value80 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'revokedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value80)) {
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
      final value81 = json['scope'];
      if (value81 is! String ||
          !const <String>{'session', 'user', 'tenant'}.contains(value81)) {
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
      final value82 = json['subjectId'];
      if (value82 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'subjectId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value82)) {
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
      final value83 = json['revokedBefore'];
      if (value83 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'revokedBefore'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value83)) {
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
