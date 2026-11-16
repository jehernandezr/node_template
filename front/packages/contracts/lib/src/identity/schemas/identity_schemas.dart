// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../identity/types/identity_types.dart';
import '../../platform/enums/platform_enums.dart';

final _pattern0 = RegExp(
  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})\$',
);
final _pattern1 = RegExp('^\\d{1,15}\\.\\d{1,15}\$');
final _pattern2 = RegExp(
  '^(?:[A-Za-z0-9_\'+\\-]+\\.)*[A-Za-z0-9_\'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}\$',
);
final _pattern3 = RegExp(
  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))\$',
);
final _pattern4 = RegExp('^[A-Za-z0-9-]+\$');
final _pattern5 = RegExp('^[A-Za-z0-9_-]+\$');
final _pattern6 = RegExp('^\\d+\\.\\d+\$');
final _pattern7 = RegExp('^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*\$');
final _pattern8 = RegExp('^[0-9]+\$');
final _pattern9 = RegExp('^[a-z0-9]+(-[a-z0-9]+)*\$');
final _pattern10 = RegExp('^[A-Z2-7]+\$');

/// Validador de [AccessTokenClaims] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class AccessTokenClaimsSchema {
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
    if (json.containsKey('iss')) {
      final value0 = json['iss'];
      if (value0 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'iss'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value0.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'iss'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value0.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'iss'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'iss'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('aud')) {
      final value1 = json['aud'];
      if (value1 is! String ||
          !const <String>{'api', 'backoffice'}.contains(value1)) {
        addFieldError(
          errors,
          joinPath(path, 'aud'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'aud'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('sub')) {
      final value2 = json['sub'];
      if (value2 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sub'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value2)) {
          addFieldError(
            errors,
            joinPath(path, 'sub'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'sub'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('tid')) {
      final value3 = json['tid'];
      if (value3 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tid'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value3)) {
          addFieldError(
            errors,
            joinPath(path, 'tid'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'tid'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('htid')) {
      final value4 = json['htid'];
      if (value4 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'htid'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value4)) {
          addFieldError(
            errors,
            joinPath(path, 'htid'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'htid'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('sid')) {
      final value5 = json['sid'];
      if (value5 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sid'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value5)) {
          addFieldError(
            errors,
            joinPath(path, 'sid'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'sid'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('did')) {
      final value6 = json['did'];
      if (value6 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'did'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value6)) {
          addFieldError(
            errors,
            joinPath(path, 'did'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    if (json.containsKey('amr')) {
      final value7 = json['amr'];
      if (value7 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'amr'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value7.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'amr'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value7.length > 6) {
          addFieldError(
            errors,
            joinPath(path, 'amr'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i8 = 0; i8 < value7.length; i8++) {
          final item9 = value7[i8];
          if (item9 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'pwd',
                    'passkey',
                    'device',
                    'email_otp',
                    'totp',
                    'recovery_code',
                  }.contains(item9))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'amr'), '$i8'),
              PlatformErrorCode.validationInvalidEnum.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'amr'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('auth_time')) {
      final value10 = json['auth_time'];
      if (value10 is! num ||
          !value10.isFinite ||
          value10 != value10.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'auth_time'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value10 <= 0) {
          addFieldError(
            errors,
            joinPath(path, 'auth_time'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value10 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'auth_time'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'auth_time'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('roles')) {
      final value11 = json['roles'];
      if (value11 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'roles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value11.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'roles'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i12 = 0; i12 < value11.length; i12++) {
          final item13 = value11[i12];
          if (item13 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'roles'), '$i12'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item13.isEmpty) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roles'), '$i12'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item13.length > 64) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roles'), '$i12'),
                PlatformErrorCode.validationTooLong.code,
              );
            }
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'roles'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('proles')) {
      final value14 = json['proles'];
      if (value14 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'proles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value14.length > 16) {
          addFieldError(
            errors,
            joinPath(path, 'proles'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i15 = 0; i15 < value14.length; i15++) {
          final item16 = value14[i15];
          if (item16 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'super_admin',
                    'support',
                    'finance',
                    'read_only',
                  }.contains(item16))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'proles'), '$i15'),
              PlatformErrorCode.validationInvalidEnum.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'proles'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('pv')) {
      final value17 = json['pv'];
      if (value17 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'pv'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value17)) {
          addFieldError(
            errors,
            joinPath(path, 'pv'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'pv'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('rgn')) {
      final value18 = json['rgn'];
      if (value18 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'rgn'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value18.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'rgn'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value18.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'rgn'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'rgn'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('sxp')) {
      final value19 = json['sxp'];
      if (value19 is! num ||
          !value19.isFinite ||
          value19 != value19.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'sxp'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value19 <= 0) {
          addFieldError(
            errors,
            joinPath(path, 'sxp'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value19 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'sxp'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'sxp'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('iat')) {
      final value20 = json['iat'];
      if (value20 is! num ||
          !value20.isFinite ||
          value20 != value20.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'iat'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value20 <= 0) {
          addFieldError(
            errors,
            joinPath(path, 'iat'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value20 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'iat'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'iat'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('exp')) {
      final value21 = json['exp'];
      if (value21 is! num ||
          !value21.isFinite ||
          value21 != value21.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'exp'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value21 <= 0) {
          addFieldError(
            errors,
            joinPath(path, 'exp'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value21 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'exp'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'exp'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('jti')) {
      final value22 = json['jti'];
      if (value22 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'jti'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value22)) {
          addFieldError(
            errors,
            joinPath(path, 'jti'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'jti'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [AccessTokenClaims] contra su contrato.
extension AccessTokenClaimsValidation on AccessTokenClaims {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => AccessTokenClaimsSchema.validate(toJson());
}

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
    if (json.containsKey('email')) {
      final value23 = json['email'];
      if (value23 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value23.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value23)) {
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
      final value24 = json['password'];
      if (value24 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'password'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value24.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'password'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value24.length > 128) {
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
      final value25 = json['deviceId'];
      if (value25 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value25.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value25.length > 512) {
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
    if (json.containsKey('accessToken')) {
      final value26 = json['accessToken'];
      if (value26 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'accessToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value26.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'accessToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value26.length > 8192) {
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
      final value27 = json['accessExpiresAt'];
      if (value27 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'accessExpiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value27)) {
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
      final value28 = json['sessionToken'];
      if (value28 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value28.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'sessionToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value28.length > 8192) {
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
    if (json.containsKey('mfaToken')) {
      final value29 = json['mfaToken'];
      if (value29 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value29.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value29.length > 2048) {
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
      final value30 = json['methods'];
      if (value30 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'methods'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value30.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'methods'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        for (var i31 = 0; i31 < value30.length; i31++) {
          final item32 = value30[i31];
          if (item32 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'device_otp',
                    'email_otp',
                    'totp',
                    'recovery_code',
                    'passkey',
                  }.contains(item32))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'methods'), '$i31'),
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
      final value33 = json['status'];
      if (value33 is! String ||
          !const <String>{'authenticated', 'mfa_required'}.contains(value33)) {
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
      final value34 = json['tokens'];
      SessionTokensSchema.check(
        value34,
        joinPath(path, 'tokens'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    }
    if (json.containsKey('mfa')) {
      final value35 = json['mfa'];
      PendingMfaSchema.check(
        value35,
        joinPath(path, 'mfa'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
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
    if (json.containsKey('mfaToken')) {
      final value36 = json['mfaToken'];
      if (value36 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value36.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value36.length > 2048) {
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
      final value37 = json['method'];
      if (value37 is! String ||
          !const <String>{
            'device_otp',
            'email_otp',
            'totp',
            'recovery_code',
            'passkey',
          }.contains(value37)) {
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
    if (json.containsKey('challengeId')) {
      final value38 = json['challengeId'];
      if (value38 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value38)) {
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
      final value39 = json['method'];
      if (value39 is! String ||
          !const <String>{
            'device_otp',
            'email_otp',
            'totp',
            'recovery_code',
            'passkey',
          }.contains(value39)) {
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
      final value40 = json['expiresAt'];
      if (value40 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'expiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value40)) {
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
      final value41 = json['codeLength'];
      if (value41 is! num ||
          !value41.isFinite ||
          value41 != value41.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'codeLength'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value41 < 6) {
          addFieldError(
            errors,
            joinPath(path, 'codeLength'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value41 > 64) {
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
    if (json.containsKey('mfaToken')) {
      final value42 = json['mfaToken'];
      if (value42 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value42.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value42.length > 2048) {
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
      final value43 = json['challengeId'];
      if (value43 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value43)) {
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
      final value44 = json['code'];
      if (value44 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value44.length < 6) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value44.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern4.hasMatch(value44)) {
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
      final value45 = json['devicePublicKey'];
      if (value45 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'devicePublicKey'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value45.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value45.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value45)) {
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

/// Validador de [SessionTokenRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SessionTokenRequestSchema {
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
    if (json.containsKey('sessionToken')) {
      final value46 = json['sessionToken'];
      if (value46 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value46.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'sessionToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value46.length > 8192) {
          addFieldError(
            errors,
            joinPath(path, 'sessionToken'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'sessionToken'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [SessionTokenRequest] contra su contrato.
extension SessionTokenRequestValidation on SessionTokenRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SessionTokenRequestSchema.validate(toJson());
}

/// Validador de [StepUpVerifyRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class StepUpVerifyRequestSchema {
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
    if (json.containsKey('mfaToken')) {
      final value47 = json['mfaToken'];
      if (value47 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value47.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value47.length > 2048) {
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
      final value48 = json['challengeId'];
      if (value48 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value48)) {
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
      final value49 = json['code'];
      if (value49 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value49.length < 6) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value49.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern4.hasMatch(value49)) {
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
    for (final key in json.keys) {
      if (!const <String>{'mfaToken', 'challengeId', 'code'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [StepUpVerifyRequest] contra su contrato.
extension StepUpVerifyRequestValidation on StepUpVerifyRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => StepUpVerifyRequestSchema.validate(toJson());
}

/// Validador de [StepUpResult] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class StepUpResultSchema {
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
    if (json.containsKey('tokens')) {
      final value50 = json['tokens'];
      SessionTokensSchema.check(
        value50,
        joinPath(path, 'tokens'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'tokens'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('mfaVerifiedAt')) {
      final value51 = json['mfaVerifiedAt'];
      if (value51 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaVerifiedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value51)) {
          addFieldError(
            errors,
            joinPath(path, 'mfaVerifiedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
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

/// Validación de [StepUpResult] contra su contrato.
extension StepUpResultValidation on StepUpResult {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => StepUpResultSchema.validate(toJson());
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
      final value52 = json['id'];
      if (value52 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value52)) {
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
      final value53 = json['deviceName'];
      if (value53 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value53.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value53.length > 120) {
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
      final value54 = json['platform'];
      if (value54 is! String ||
          !const <String>{
            'ios',
            'android',
            'web',
            'macos',
            'windows',
            'linux',
          }.contains(value54)) {
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
      final value55 = json['lastSeenAt'];
      if (value55 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'lastSeenAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value55)) {
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
      final value56 = json['current'];
      if (value56 is! bool) {
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
          SessionSummarySchema.check(
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
          if (!_pattern5.hasMatch(value60)) {
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
      final value61 = json['id'];
      if (value61 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value61)) {
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
      final value62 = json['name'];
      if (value62 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value62.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value62.length > 120) {
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
      final value63 = json['platform'];
      if (value63 is! String ||
          !const <String>{
            'ios',
            'android',
            'web',
            'macos',
            'windows',
            'linux',
          }.contains(value63)) {
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
      final value64 = json['lastSeenAt'];
      if (value64 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'lastSeenAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value64)) {
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
      final value65 = json['trustedUntil'];
      if (value65 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'trustedUntil'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value65)) {
          addFieldError(
            errors,
            joinPath(path, 'trustedUntil'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    if (json.containsKey('verifier')) {
      final value66 = json['verifier'];
      if (value66 is! bool) {
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
      final value67 = json['items'];
      if (value67 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value67.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i68 = 0; i68 < value67.length; i68++) {
          final item69 = value67[i68];
          DeviceSummarySchema.check(
            item69,
            joinPath(joinPath(path, 'items'), '$i68'),
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
      final value70 = json['nextCursor'];
      if (value70 != null) {
        if (value70 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value70.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value70.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern5.hasMatch(value70)) {
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
    if (json.containsKey('sessionId')) {
      final value71 = json['sessionId'];
      if (value71 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value71)) {
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
    if (json.containsKey('revoked')) {
      final value72 = json['revoked'];
      if (value72 is! num ||
          !value72.isFinite ||
          value72 != value72.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'revoked'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value72 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'revoked'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value72 > 9007199254740991) {
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
      final value73 = json['userId'];
      if (value73 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value73)) {
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
      final value74 = json['reason'];
      if (value74 is! String ||
          !const <String>{
            'logout',
            'user_action',
            'password_changed',
            'admin_action',
            'compromised',
          }.contains(value74)) {
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
      final value75 = json['userId'];
      if (value75 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value75)) {
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
      final value76 = json['tenantId'];
      if (value76 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value76)) {
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
    if (json.containsKey('permissions')) {
      final value77 = json['permissions'];
      if (value77 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i78 = 0; i78 < value77.length; i78++) {
          final item79 = value77[i78];
          if (item79 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item79))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i78'),
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
    if (json.containsKey('roles')) {
      final value80 = json['roles'];
      if (value80 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'roles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value80.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'roles'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i81 = 0; i81 < value80.length; i81++) {
          final item82 = value80[i81];
          if (item82 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'roles'), '$i81'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item82.isEmpty) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roles'), '$i81'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item82.length > 80) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roles'), '$i81'),
                PlatformErrorCode.validationTooLong.code,
              );
            }
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'roles'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('permissionVersion')) {
      final value83 = json['permissionVersion'];
      if (value83 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'permissionVersion'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value83.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'permissionVersion'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value83)) {
          addFieldError(
            errors,
            joinPath(path, 'permissionVersion'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'permissionVersion'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('platformRoles')) {
      final value84 = json['platformRoles'];
      if (value84 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'platformRoles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i85 = 0; i85 < value84.length; i85++) {
          final item86 = value84[i85];
          if (item86 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'super_admin',
                    'support',
                    'finance',
                    'read_only',
                  }.contains(item86))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'platformRoles'), '$i85'),
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
      final value87 = json['features'];
      if (value87 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'features'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i88 = 0; i88 < value87.length; i88++) {
          final item89 = value87[i88];
          if (item89 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'ai_assistant',
                    'webhooks',
                    'billing',
                  }.contains(item89))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'features'), '$i88'),
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
      final value90 = json['flags'];
      if (value90 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'flags'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i91 = 0; i91 < value90.length; i91++) {
          final item92 = value90[i91];
          if (item92 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{'new_reports'}.contains(item92))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'flags'), '$i91'),
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
      final value93 = json['userId'];
      if (value93 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value93)) {
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
      final value94 = json['tenantId'];
      if (value94 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value94)) {
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
      final value95 = json['sessionId'];
      if (value95 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value95)) {
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
      final value96 = json['permissions'];
      if (value96 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i97 = 0; i97 < value96.length; i97++) {
          final item98 = value96[i97];
          if (item98 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item98))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i97'),
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
    if (json.containsKey('roles')) {
      final value99 = json['roles'];
      if (value99 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'roles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value99.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'roles'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i100 = 0; i100 < value99.length; i100++) {
          final item101 = value99[i100];
          if (item101 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'roles'), '$i100'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item101.isEmpty) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roles'), '$i100'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item101.length > 80) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roles'), '$i100'),
                PlatformErrorCode.validationTooLong.code,
              );
            }
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'roles'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('permissionVersion')) {
      final value102 = json['permissionVersion'];
      if (value102 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'permissionVersion'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value102.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'permissionVersion'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value102)) {
          addFieldError(
            errors,
            joinPath(path, 'permissionVersion'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'permissionVersion'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('platformRoles')) {
      final value103 = json['platformRoles'];
      if (value103 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'platformRoles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i104 = 0; i104 < value103.length; i104++) {
          final item105 = value103[i104];
          if (item105 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'super_admin',
                    'support',
                    'finance',
                    'read_only',
                  }.contains(item105))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'platformRoles'), '$i104'),
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
      final value106 = json['features'];
      if (value106 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'features'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i107 = 0; i107 < value106.length; i107++) {
          final item108 = value106[i107];
          if (item108 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'ai_assistant',
                    'webhooks',
                    'billing',
                  }.contains(item108))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'features'), '$i107'),
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
      final value109 = json['flags'];
      if (value109 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'flags'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i110 = 0; i110 < value109.length; i110++) {
          final item111 = value109[i110];
          if (item111 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{'new_reports'}.contains(item111))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'flags'), '$i110'),
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
      final value112 = json['mfaVerifiedAt'];
      if (value112 != null) {
        if (value112 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'mfaVerifiedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern3.hasMatch(value112)) {
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
    if (json.containsKey('sessionId')) {
      final value113 = json['sessionId'];
      if (value113 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value113)) {
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
      final value114 = json['userId'];
      if (value114 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value114)) {
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
      final value115 = json['tenantId'];
      if (value115 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value115)) {
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
      final value116 = json['reason'];
      if (value116 is! String ||
          !const <String>{
            'logout',
            'user_action',
            'password_changed',
            'admin_action',
            'compromised',
          }.contains(value116)) {
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
      final value117 = json['revokedAt'];
      if (value117 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'revokedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value117)) {
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
    if (json.containsKey('scope')) {
      final value118 = json['scope'];
      if (value118 is! String ||
          !const <String>{'session', 'user', 'tenant'}.contains(value118)) {
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
      final value119 = json['subjectId'];
      if (value119 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'subjectId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value119)) {
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
      final value120 = json['revokedBefore'];
      if (value120 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'revokedBefore'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value120)) {
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

/// Validador de [SignUpRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SignUpRequestSchema {
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
    if (json.containsKey('email')) {
      final value121 = json['email'];
      if (value121 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value121.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value121)) {
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
      final value122 = json['password'];
      if (value122 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'password'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value122.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'password'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value122.length > 128) {
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
    if (json.containsKey('displayName')) {
      final value123 = json['displayName'];
      if (value123 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'displayName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value123.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value123.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'displayName'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('locale')) {
      final value124 = json['locale'];
      if (value124 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'locale'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value124.length < 2) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value124.length > 35) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern7.hasMatch(value124)) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'locale'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('invitationToken')) {
      final value125 = json['invitationToken'];
      if (value125 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invitationToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value125.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'invitationToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value125.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'invitationToken'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{
        'email',
        'password',
        'displayName',
        'locale',
        'invitationToken',
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

/// Validación de [SignUpRequest] contra su contrato.
extension SignUpRequestValidation on SignUpRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SignUpRequestSchema.validate(toJson());
}

/// Validador de [EmailVerificationRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class EmailVerificationRequestSchema {
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
    if (json.containsKey('email')) {
      final value126 = json['email'];
      if (value126 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value126.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value126)) {
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
    for (final key in json.keys) {
      if (!const <String>{'email'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [EmailVerificationRequest] contra su contrato.
extension EmailVerificationRequestValidation on EmailVerificationRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      EmailVerificationRequestSchema.validate(toJson());
}

/// Validador de [EmailVerificationConfirmRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class EmailVerificationConfirmRequestSchema {
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
    if (json.containsKey('token')) {
      final value127 = json['token'];
      if (value127 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'token'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value127.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value127.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'token'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'token'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [EmailVerificationConfirmRequest] contra su contrato.
extension EmailVerificationConfirmRequestValidation
    on EmailVerificationConfirmRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      EmailVerificationConfirmRequestSchema.validate(toJson());
}

/// Validador de [UserProfile] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UserProfileSchema {
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
      final value128 = json['id'];
      if (value128 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value128)) {
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
    if (json.containsKey('email')) {
      final value129 = json['email'];
      if (value129 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value129.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value129)) {
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
    if (json.containsKey('emailVerifiedAt')) {
      final value130 = json['emailVerifiedAt'];
      if (value130 != null) {
        if (value130 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'emailVerifiedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern3.hasMatch(value130)) {
            addFieldError(
              errors,
              joinPath(path, 'emailVerifiedAt'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'emailVerifiedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('displayName')) {
      final value131 = json['displayName'];
      if (value131 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'displayName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value131.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value131.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'displayName'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('locale')) {
      final value132 = json['locale'];
      if (value132 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'locale'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value132.length < 2) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value132.length > 35) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern7.hasMatch(value132)) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'locale'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value133 = json['status'];
      if (value133 is! String ||
          !const <String>{
            'pending_verification',
            'active',
            'suspended',
            'deleted',
          }.contains(value133)) {
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
    if (json.containsKey('homeTenantId')) {
      final value134 = json['homeTenantId'];
      if (value134 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'homeTenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value134)) {
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
    if (json.containsKey('lastTenantId')) {
      final value135 = json['lastTenantId'];
      if (value135 != null) {
        if (value135 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'lastTenantId'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern0.hasMatch(value135)) {
            addFieldError(
              errors,
              joinPath(path, 'lastTenantId'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'lastTenantId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [UserProfile] contra su contrato.
extension UserProfileValidation on UserProfile {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => UserProfileSchema.validate(toJson());
}

/// Validador de [UpdateProfileRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UpdateProfileRequestSchema {
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
    if (json.containsKey('displayName')) {
      final value136 = json['displayName'];
      if (value136 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'displayName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value136.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value136.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('locale')) {
      final value137 = json['locale'];
      if (value137 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'locale'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value137.length < 2) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value137.length > 35) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern7.hasMatch(value137)) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'displayName', 'locale'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [UpdateProfileRequest] contra su contrato.
extension UpdateProfileRequestValidation on UpdateProfileRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => UpdateProfileRequestSchema.validate(toJson());
}

/// Validador de [EmailChangeRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class EmailChangeRequestSchema {
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
    if (json.containsKey('newEmail')) {
      final value138 = json['newEmail'];
      if (value138 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'newEmail'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value138.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'newEmail'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value138)) {
          addFieldError(
            errors,
            joinPath(path, 'newEmail'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'newEmail'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'newEmail'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [EmailChangeRequest] contra su contrato.
extension EmailChangeRequestValidation on EmailChangeRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => EmailChangeRequestSchema.validate(toJson());
}

/// Validador de [EmailChangeConfirmRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class EmailChangeConfirmRequestSchema {
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
    if (json.containsKey('token')) {
      final value139 = json['token'];
      if (value139 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'token'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value139.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value139.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'token'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'token'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [EmailChangeConfirmRequest] contra su contrato.
extension EmailChangeConfirmRequestValidation on EmailChangeConfirmRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      EmailChangeConfirmRequestSchema.validate(toJson());
}

/// Validador de [SuspendUserInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SuspendUserInputSchema {
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
      final value140 = json['userId'];
      if (value140 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value140)) {
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
      final value141 = json['reason'];
      if (value141 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reason'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value141.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value141.length > 200) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
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

/// Validación de [SuspendUserInput] contra su contrato.
extension SuspendUserInputValidation on SuspendUserInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SuspendUserInputSchema.validate(toJson());
}

/// Validador de [ReactivateUserInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ReactivateUserInputSchema {
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
      final value142 = json['userId'];
      if (value142 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value142)) {
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
    for (final key in json.keys) {
      if (!const <String>{'userId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [ReactivateUserInput] contra su contrato.
extension ReactivateUserInputValidation on ReactivateUserInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => ReactivateUserInputSchema.validate(toJson());
}

/// Validador de [UserOperationResult] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UserOperationResultSchema {
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
      final value143 = json['userId'];
      if (value143 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value143)) {
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
    if (json.containsKey('status')) {
      final value144 = json['status'];
      if (value144 is! String ||
          !const <String>{
            'pending_verification',
            'active',
            'suspended',
            'deleted',
          }.contains(value144)) {
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
  }
}

/// Validación de [UserOperationResult] contra su contrato.
extension UserOperationResultValidation on UserOperationResult {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => UserOperationResultSchema.validate(toJson());
}

/// Validador de [GetUserProfileInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class GetUserProfileInputSchema {
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
      final value145 = json['userId'];
      if (value145 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value145)) {
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
    for (final key in json.keys) {
      if (!const <String>{'userId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [GetUserProfileInput] contra su contrato.
extension GetUserProfileInputValidation on GetUserProfileInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => GetUserProfileInputSchema.validate(toJson());
}

/// Validador de [ChangePasswordRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ChangePasswordRequestSchema {
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
    if (json.containsKey('currentPassword')) {
      final value146 = json['currentPassword'];
      if (value146 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'currentPassword'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value146.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'currentPassword'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value146.length > 128) {
          addFieldError(
            errors,
            joinPath(path, 'currentPassword'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'currentPassword'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('newPassword')) {
      final value147 = json['newPassword'];
      if (value147 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'newPassword'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value147.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'newPassword'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value147.length > 128) {
          addFieldError(
            errors,
            joinPath(path, 'newPassword'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'newPassword'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'currentPassword', 'newPassword'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [ChangePasswordRequest] contra su contrato.
extension ChangePasswordRequestValidation on ChangePasswordRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => ChangePasswordRequestSchema.validate(toJson());
}

/// Validador de [PasswordResetRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PasswordResetRequestSchema {
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
    if (json.containsKey('email')) {
      final value148 = json['email'];
      if (value148 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value148.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value148)) {
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
    for (final key in json.keys) {
      if (!const <String>{'email'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [PasswordResetRequest] contra su contrato.
extension PasswordResetRequestValidation on PasswordResetRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => PasswordResetRequestSchema.validate(toJson());
}

/// Validador de [PasswordResetConfirmRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PasswordResetConfirmRequestSchema {
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
    if (json.containsKey('token')) {
      final value149 = json['token'];
      if (value149 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'token'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value149.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value149.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'token'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('newPassword')) {
      final value150 = json['newPassword'];
      if (value150 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'newPassword'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value150.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'newPassword'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value150.length > 128) {
          addFieldError(
            errors,
            joinPath(path, 'newPassword'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'newPassword'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'token', 'newPassword'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [PasswordResetConfirmRequest] contra su contrato.
extension PasswordResetConfirmRequestValidation on PasswordResetConfirmRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      PasswordResetConfirmRequestSchema.validate(toJson());
}

/// Validador de [RemoveDeviceRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class RemoveDeviceRequestSchema {
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
    if (json.containsKey('deviceId')) {
      final value151 = json['deviceId'];
      if (value151 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value151)) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'deviceId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'deviceId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [RemoveDeviceRequest] contra su contrato.
extension RemoveDeviceRequestValidation on RemoveDeviceRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => RemoveDeviceRequestSchema.validate(toJson());
}

/// Validador de [UntrustDeviceRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UntrustDeviceRequestSchema {
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
    if (json.containsKey('deviceId')) {
      final value152 = json['deviceId'];
      if (value152 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value152)) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'deviceId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'deviceId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [UntrustDeviceRequest] contra su contrato.
extension UntrustDeviceRequestValidation on UntrustDeviceRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => UntrustDeviceRequestSchema.validate(toJson());
}

/// Validador de [PushTokenRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PushTokenRequestSchema {
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
    if (json.containsKey('pushToken')) {
      final value153 = json['pushToken'];
      if (value153 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'pushToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value153.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'pushToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value153.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'pushToken'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'pushToken'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'pushToken'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [PushTokenRequest] contra su contrato.
extension PushTokenRequestValidation on PushTokenRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => PushTokenRequestSchema.validate(toJson());
}

/// Validador de [PullDeviceApprovalsRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PullDeviceApprovalsRequestSchema {
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
    if (json.containsKey('deviceId')) {
      final value154 = json['deviceId'];
      if (value154 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value154.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value154.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'deviceId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('timestamp')) {
      final value155 = json['timestamp'];
      if (value155 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'timestamp'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value155)) {
          addFieldError(
            errors,
            joinPath(path, 'timestamp'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'timestamp'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('nonce')) {
      final value156 = json['nonce'];
      if (value156 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'nonce'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value156.length < 16) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value156.length > 128) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value156)) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'nonce'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('signature')) {
      final value157 = json['signature'];
      if (value157 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'signature'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value157.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value157.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value157)) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'signature'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{
        'deviceId',
        'timestamp',
        'nonce',
        'signature',
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

/// Validación de [PullDeviceApprovalsRequest] contra su contrato.
extension PullDeviceApprovalsRequestValidation on PullDeviceApprovalsRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      PullDeviceApprovalsRequestSchema.validate(toJson());
}

/// Validador de [DenyDeviceApprovalRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class DenyDeviceApprovalRequestSchema {
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
    if (json.containsKey('challengeId')) {
      final value158 = json['challengeId'];
      if (value158 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value158)) {
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
    if (json.containsKey('deviceId')) {
      final value159 = json['deviceId'];
      if (value159 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value159.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value159.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'deviceId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('timestamp')) {
      final value160 = json['timestamp'];
      if (value160 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'timestamp'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value160)) {
          addFieldError(
            errors,
            joinPath(path, 'timestamp'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'timestamp'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('nonce')) {
      final value161 = json['nonce'];
      if (value161 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'nonce'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value161.length < 16) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value161.length > 128) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value161)) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'nonce'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('signature')) {
      final value162 = json['signature'];
      if (value162 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'signature'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value162.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value162.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value162)) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'signature'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{
        'challengeId',
        'deviceId',
        'timestamp',
        'nonce',
        'signature',
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

/// Validación de [DenyDeviceApprovalRequest] contra su contrato.
extension DenyDeviceApprovalRequestValidation on DenyDeviceApprovalRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      DenyDeviceApprovalRequestSchema.validate(toJson());
}

/// Validador de [ApprovalContext] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ApprovalContextSchema {
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
    if (json.containsKey('browser')) {
      final value163 = json['browser'];
      if (value163 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'browser'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value163.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'browser'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value163.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'browser'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('os')) {
      final value164 = json['os'];
      if (value164 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'os'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value164.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'os'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value164.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'os'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('ip')) {
      final value165 = json['ip'];
      if (value165 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'ip'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value165.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'ip'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value165.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'ip'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('city')) {
      final value166 = json['city'];
      if (value166 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'city'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value166.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'city'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value166.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'city'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
  }
}

/// Validación de [ApprovalContext] contra su contrato.
extension ApprovalContextValidation on ApprovalContext {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => ApprovalContextSchema.validate(toJson());
}

/// Validador de [DeviceApproval] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class DeviceApprovalSchema {
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
    if (json.containsKey('challengeId')) {
      final value167 = json['challengeId'];
      if (value167 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value167)) {
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
      final value168 = json['code'];
      if (value168 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value168.length < 6) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value168.length > 64) {
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
    if (json.containsKey('requestedAt')) {
      final value169 = json['requestedAt'];
      if (value169 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'requestedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value169)) {
          addFieldError(
            errors,
            joinPath(path, 'requestedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'requestedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('expiresAt')) {
      final value170 = json['expiresAt'];
      if (value170 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'expiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value170)) {
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
    if (json.containsKey('context')) {
      final value171 = json['context'];
      ApprovalContextSchema.check(
        value171,
        joinPath(path, 'context'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'context'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [DeviceApproval] contra su contrato.
extension DeviceApprovalValidation on DeviceApproval {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => DeviceApprovalSchema.validate(toJson());
}

/// Validador de [DeviceApprovals] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class DeviceApprovalsSchema {
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
    if (json.containsKey('approvals')) {
      final value172 = json['approvals'];
      if (value172 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'approvals'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value172.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'approvals'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i173 = 0; i173 < value172.length; i173++) {
          final item174 = value172[i173];
          DeviceApprovalSchema.check(
            item174,
            joinPath(joinPath(path, 'approvals'), '$i173'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'approvals'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [DeviceApprovals] contra su contrato.
extension DeviceApprovalsValidation on DeviceApprovals {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => DeviceApprovalsSchema.validate(toJson());
}

/// Validador de [TotpEnrollment] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TotpEnrollmentSchema {
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
    if (json.containsKey('secret')) {
      final value175 = json['secret'];
      if (value175 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'secret'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value175.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'secret'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value175.length > 128) {
          addFieldError(
            errors,
            joinPath(path, 'secret'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'secret'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('otpauthUri')) {
      final value176 = json['otpauthUri'];
      if (value176 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'otpauthUri'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value176.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'otpauthUri'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value176.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'otpauthUri'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'otpauthUri'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TotpEnrollment] contra su contrato.
extension TotpEnrollmentValidation on TotpEnrollment {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TotpEnrollmentSchema.validate(toJson());
}

/// Validador de [TotpConfirmRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TotpConfirmRequestSchema {
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
    if (json.containsKey('code')) {
      final value177 = json['code'];
      if (value177 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value177.length < 6) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value177.length > 8) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern8.hasMatch(value177)) {
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
    for (final key in json.keys) {
      if (!const <String>{'code'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [TotpConfirmRequest] contra su contrato.
extension TotpConfirmRequestValidation on TotpConfirmRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TotpConfirmRequestSchema.validate(toJson());
}

/// Validador de [RecoveryCodes] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class RecoveryCodesSchema {
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
    if (json.containsKey('codes')) {
      final value178 = json['codes'];
      if (value178 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'codes'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value178.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'codes'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i179 = 0; i179 < value178.length; i179++) {
          final item180 = value178[i179];
          if (item180 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'codes'), '$i179'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item180.length < 8) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'codes'), '$i179'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item180.length > 64) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'codes'), '$i179'),
                PlatformErrorCode.validationTooLong.code,
              );
            }
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'codes'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [RecoveryCodes] contra su contrato.
extension RecoveryCodesValidation on RecoveryCodes {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => RecoveryCodesSchema.validate(toJson());
}

/// Validador de [MfaRecoveryStartRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class MfaRecoveryStartRequestSchema {
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
    if (json.containsKey('mfaToken')) {
      final value181 = json['mfaToken'];
      if (value181 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value181.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value181.length > 2048) {
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
    for (final key in json.keys) {
      if (!const <String>{'mfaToken'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [MfaRecoveryStartRequest] contra su contrato.
extension MfaRecoveryStartRequestValidation on MfaRecoveryStartRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      MfaRecoveryStartRequestSchema.validate(toJson());
}

/// Validador de [MfaRecoveryStarted] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class MfaRecoveryStartedSchema {
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
    if (json.containsKey('availableAt')) {
      final value182 = json['availableAt'];
      if (value182 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'availableAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value182)) {
          addFieldError(
            errors,
            joinPath(path, 'availableAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'availableAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [MfaRecoveryStarted] contra su contrato.
extension MfaRecoveryStartedValidation on MfaRecoveryStarted {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => MfaRecoveryStartedSchema.validate(toJson());
}

/// Validador de [MfaRecoveryConfirmRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class MfaRecoveryConfirmRequestSchema {
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
    if (json.containsKey('mfaToken')) {
      final value183 = json['mfaToken'];
      if (value183 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value183.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value183.length > 2048) {
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
    if (json.containsKey('token')) {
      final value184 = json['token'];
      if (value184 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'token'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value184.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value184.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'token'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('devicePublicKey')) {
      final value185 = json['devicePublicKey'];
      if (value185 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'devicePublicKey'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value185.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value185.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value185)) {
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
        'token',
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

/// Validación de [MfaRecoveryConfirmRequest] contra su contrato.
extension MfaRecoveryConfirmRequestValidation on MfaRecoveryConfirmRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      MfaRecoveryConfirmRequestSchema.validate(toJson());
}

/// Validador de [PasskeyOptions] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PasskeyOptionsSchema {
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
    if (json.containsKey('challengeId')) {
      final value186 = json['challengeId'];
      if (value186 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value186)) {
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
    if (json.containsKey('optionsJson')) {
      final value187 = json['optionsJson'];
      if (value187 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'optionsJson'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value187.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'optionsJson'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value187.length > 8192) {
          addFieldError(
            errors,
            joinPath(path, 'optionsJson'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value187)) {
          addFieldError(
            errors,
            joinPath(path, 'optionsJson'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'optionsJson'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [PasskeyOptions] contra su contrato.
extension PasskeyOptionsValidation on PasskeyOptions {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => PasskeyOptionsSchema.validate(toJson());
}

/// Validador de [PasskeySignInVerifyRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PasskeySignInVerifyRequestSchema {
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
    if (json.containsKey('challengeId')) {
      final value188 = json['challengeId'];
      if (value188 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value188)) {
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
    if (json.containsKey('credentialJson')) {
      final value189 = json['credentialJson'];
      if (value189 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'credentialJson'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value189.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value189.length > 16384) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value189)) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'credentialJson'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('deviceId')) {
      final value190 = json['deviceId'];
      if (value190 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value190.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value190.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{
        'challengeId',
        'credentialJson',
        'deviceId',
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

/// Validación de [PasskeySignInVerifyRequest] contra su contrato.
extension PasskeySignInVerifyRequestValidation on PasskeySignInVerifyRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      PasskeySignInVerifyRequestSchema.validate(toJson());
}

/// Validador de [PasskeyMfaOptionsRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PasskeyMfaOptionsRequestSchema {
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
    if (json.containsKey('mfaToken')) {
      final value191 = json['mfaToken'];
      if (value191 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value191.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value191.length > 2048) {
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
    for (final key in json.keys) {
      if (!const <String>{'mfaToken'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [PasskeyMfaOptionsRequest] contra su contrato.
extension PasskeyMfaOptionsRequestValidation on PasskeyMfaOptionsRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      PasskeyMfaOptionsRequestSchema.validate(toJson());
}

/// Validador de [PasskeyMfaVerifyRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PasskeyMfaVerifyRequestSchema {
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
    if (json.containsKey('mfaToken')) {
      final value192 = json['mfaToken'];
      if (value192 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value192.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value192.length > 2048) {
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
      final value193 = json['challengeId'];
      if (value193 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value193)) {
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
    if (json.containsKey('credentialJson')) {
      final value194 = json['credentialJson'];
      if (value194 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'credentialJson'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value194.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value194.length > 16384) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value194)) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'credentialJson'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('devicePublicKey')) {
      final value195 = json['devicePublicKey'];
      if (value195 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'devicePublicKey'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value195.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value195.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value195)) {
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
        'credentialJson',
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

/// Validación de [PasskeyMfaVerifyRequest] contra su contrato.
extension PasskeyMfaVerifyRequestValidation on PasskeyMfaVerifyRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      PasskeyMfaVerifyRequestSchema.validate(toJson());
}

/// Validador de [PasskeyStepUpOptionsRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PasskeyStepUpOptionsRequestSchema {
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
    if (json.containsKey('mfaToken')) {
      final value196 = json['mfaToken'];
      if (value196 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value196.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value196.length > 2048) {
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
    for (final key in json.keys) {
      if (!const <String>{'mfaToken'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [PasskeyStepUpOptionsRequest] contra su contrato.
extension PasskeyStepUpOptionsRequestValidation on PasskeyStepUpOptionsRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      PasskeyStepUpOptionsRequestSchema.validate(toJson());
}

/// Validador de [PasskeyStepUpVerifyRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PasskeyStepUpVerifyRequestSchema {
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
    if (json.containsKey('mfaToken')) {
      final value197 = json['mfaToken'];
      if (value197 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value197.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value197.length > 2048) {
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
      final value198 = json['challengeId'];
      if (value198 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value198)) {
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
    if (json.containsKey('credentialJson')) {
      final value199 = json['credentialJson'];
      if (value199 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'credentialJson'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value199.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value199.length > 16384) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value199)) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'credentialJson'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{
        'mfaToken',
        'challengeId',
        'credentialJson',
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

/// Validación de [PasskeyStepUpVerifyRequest] contra su contrato.
extension PasskeyStepUpVerifyRequestValidation on PasskeyStepUpVerifyRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      PasskeyStepUpVerifyRequestSchema.validate(toJson());
}

/// Validador de [PasskeySummary] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PasskeySummarySchema {
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
      final value200 = json['id'];
      if (value200 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value200)) {
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
      final value201 = json['name'];
      if (value201 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value201.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value201.length > 120) {
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
    if (json.containsKey('createdAt')) {
      final value202 = json['createdAt'];
      if (value202 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value202)) {
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
    if (json.containsKey('lastUsedAt')) {
      final value203 = json['lastUsedAt'];
      if (value203 != null) {
        if (value203 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'lastUsedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern3.hasMatch(value203)) {
            addFieldError(
              errors,
              joinPath(path, 'lastUsedAt'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'lastUsedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('backedUp')) {
      final value204 = json['backedUp'];
      if (value204 is! bool) {
        addFieldError(
          errors,
          joinPath(path, 'backedUp'),
          PlatformErrorCode.validationInvalidType.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'backedUp'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [PasskeySummary] contra su contrato.
extension PasskeySummaryValidation on PasskeySummary {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => PasskeySummarySchema.validate(toJson());
}

/// Validador de [PasskeyPage] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PasskeyPageSchema {
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
      final value205 = json['items'];
      if (value205 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value205.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i206 = 0; i206 < value205.length; i206++) {
          final item207 = value205[i206];
          PasskeySummarySchema.check(
            item207,
            joinPath(joinPath(path, 'items'), '$i206'),
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
      final value208 = json['nextCursor'];
      if (value208 != null) {
        if (value208 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value208.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value208.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern5.hasMatch(value208)) {
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

/// Validación de [PasskeyPage] contra su contrato.
extension PasskeyPageValidation on PasskeyPage {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => PasskeyPageSchema.validate(toJson());
}

/// Validador de [RegisterPasskeyRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class RegisterPasskeyRequestSchema {
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
    if (json.containsKey('challengeId')) {
      final value209 = json['challengeId'];
      if (value209 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value209)) {
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
    if (json.containsKey('credentialJson')) {
      final value210 = json['credentialJson'];
      if (value210 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'credentialJson'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value210.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value210.length > 16384) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value210)) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'credentialJson'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('name')) {
      final value211 = json['name'];
      if (value211 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value211.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value211.length > 120) {
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
    for (final key in json.keys) {
      if (!const <String>{
        'challengeId',
        'credentialJson',
        'name',
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

/// Validación de [RegisterPasskeyRequest] contra su contrato.
extension RegisterPasskeyRequestValidation on RegisterPasskeyRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      RegisterPasskeyRequestSchema.validate(toJson());
}

/// Validador de [RemovePasskeyRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class RemovePasskeyRequestSchema {
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
    if (json.containsKey('passkeyId')) {
      final value212 = json['passkeyId'];
      if (value212 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'passkeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value212)) {
          addFieldError(
            errors,
            joinPath(path, 'passkeyId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'passkeyId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'passkeyId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [RemovePasskeyRequest] contra su contrato.
extension RemovePasskeyRequestValidation on RemovePasskeyRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => RemovePasskeyRequestSchema.validate(toJson());
}

/// Validador de [TenantSummary] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TenantSummarySchema {
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
      final value213 = json['id'];
      if (value213 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value213)) {
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
    if (json.containsKey('slug')) {
      final value214 = json['slug'];
      if (value214 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'slug'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value214.length < 3) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value214.length > 63) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern9.hasMatch(value214)) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'slug'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('name')) {
      final value215 = json['name'];
      if (value215 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value215.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value215.length > 120) {
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
    if (json.containsKey('region')) {
      final value216 = json['region'];
      if (value216 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value216.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value216.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'region'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('kind')) {
      final value217 = json['kind'];
      if (value217 is! String ||
          !const <String>{
            'organization',
            'shared_customers',
            'platform',
          }.contains(value217)) {
        addFieldError(
          errors,
          joinPath(path, 'kind'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'kind'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value218 = json['status'];
      if (value218 is! String ||
          !const <String>{
            'provisioning',
            'active',
            'suspended',
            'deleting',
          }.contains(value218)) {
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
  }
}

/// Validación de [TenantSummary] contra su contrato.
extension TenantSummaryValidation on TenantSummary {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TenantSummarySchema.validate(toJson());
}

/// Validador de [CreateTenantRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class CreateTenantRequestSchema {
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
    if (json.containsKey('slug')) {
      final value219 = json['slug'];
      if (value219 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'slug'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value219.length < 3) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value219.length > 63) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern9.hasMatch(value219)) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'slug'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('name')) {
      final value220 = json['name'];
      if (value220 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value220.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value220.length > 120) {
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
    if (json.containsKey('region')) {
      final value221 = json['region'];
      if (value221 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value221.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value221.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'slug', 'name', 'region'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [CreateTenantRequest] contra su contrato.
extension CreateTenantRequestValidation on CreateTenantRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => CreateTenantRequestSchema.validate(toJson());
}

/// Validador de [UpdateTenantRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UpdateTenantRequestSchema {
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
      final value222 = json['name'];
      if (value222 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value222.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value222.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'name'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [UpdateTenantRequest] contra su contrato.
extension UpdateTenantRequestValidation on UpdateTenantRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => UpdateTenantRequestSchema.validate(toJson());
}

/// Validador de [MyTenantSummary] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class MyTenantSummarySchema {
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
      final value223 = json['id'];
      if (value223 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value223)) {
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
    if (json.containsKey('slug')) {
      final value224 = json['slug'];
      if (value224 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'slug'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value224.length < 3) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value224.length > 63) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern9.hasMatch(value224)) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'slug'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('name')) {
      final value225 = json['name'];
      if (value225 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value225.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value225.length > 120) {
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
    if (json.containsKey('kind')) {
      final value226 = json['kind'];
      if (value226 is! String ||
          !const <String>{
            'organization',
            'shared_customers',
            'platform',
          }.contains(value226)) {
        addFieldError(
          errors,
          joinPath(path, 'kind'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'kind'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value227 = json['status'];
      if (value227 is! String ||
          !const <String>{
            'provisioning',
            'active',
            'suspended',
            'deleting',
          }.contains(value227)) {
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
    if (json.containsKey('joinedAt')) {
      final value228 = json['joinedAt'];
      if (value228 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'joinedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value228)) {
          addFieldError(
            errors,
            joinPath(path, 'joinedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'joinedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [MyTenantSummary] contra su contrato.
extension MyTenantSummaryValidation on MyTenantSummary {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => MyTenantSummarySchema.validate(toJson());
}

/// Validador de [MyTenantPage] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class MyTenantPageSchema {
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
      final value229 = json['items'];
      if (value229 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value229.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i230 = 0; i230 < value229.length; i230++) {
          final item231 = value229[i230];
          MyTenantSummarySchema.check(
            item231,
            joinPath(joinPath(path, 'items'), '$i230'),
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
      final value232 = json['nextCursor'];
      if (value232 != null) {
        if (value232 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value232.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value232.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern5.hasMatch(value232)) {
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

/// Validación de [MyTenantPage] contra su contrato.
extension MyTenantPageValidation on MyTenantPage {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => MyTenantPageSchema.validate(toJson());
}

/// Validador de [SwitchTenantRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SwitchTenantRequestSchema {
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
      final value233 = json['tenantId'];
      if (value233 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value233)) {
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
      if (!const <String>{'tenantId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [SwitchTenantRequest] contra su contrato.
extension SwitchTenantRequestValidation on SwitchTenantRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SwitchTenantRequestSchema.validate(toJson());
}

/// Validador de [TenantOperationResult] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TenantOperationResultSchema {
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
      final value234 = json['tenantId'];
      if (value234 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value234)) {
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
    if (json.containsKey('status')) {
      final value235 = json['status'];
      if (value235 is! String ||
          !const <String>{
            'provisioning',
            'active',
            'suspended',
            'deleting',
          }.contains(value235)) {
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
  }
}

/// Validación de [TenantOperationResult] contra su contrato.
extension TenantOperationResultValidation on TenantOperationResult {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TenantOperationResultSchema.validate(toJson());
}

/// Validador de [CreateTenantInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class CreateTenantInputSchema {
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
      final value236 = json['tenantId'];
      if (value236 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value236)) {
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
    if (json.containsKey('slug')) {
      final value237 = json['slug'];
      if (value237 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'slug'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value237.length < 3) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value237.length > 63) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern9.hasMatch(value237)) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'slug'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('name')) {
      final value238 = json['name'];
      if (value238 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value238.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value238.length > 120) {
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
    if (json.containsKey('region')) {
      final value239 = json['region'];
      if (value239 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value239.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value239.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'region'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('kind')) {
      final value240 = json['kind'];
      if (value240 is! String ||
          !const <String>{
            'organization',
            'shared_customers',
            'platform',
          }.contains(value240)) {
        addFieldError(
          errors,
          joinPath(path, 'kind'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'kind'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('ownerUserId')) {
      final value241 = json['ownerUserId'];
      if (value241 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'ownerUserId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value241)) {
          addFieldError(
            errors,
            joinPath(path, 'ownerUserId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'ownerUserId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{
        'tenantId',
        'slug',
        'name',
        'region',
        'kind',
        'ownerUserId',
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

/// Validación de [CreateTenantInput] contra su contrato.
extension CreateTenantInputValidation on CreateTenantInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => CreateTenantInputSchema.validate(toJson());
}

/// Validador de [TenantRefInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TenantRefInputSchema {
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
      final value242 = json['tenantId'];
      if (value242 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value242)) {
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
      if (!const <String>{'tenantId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [TenantRefInput] contra su contrato.
extension TenantRefInputValidation on TenantRefInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TenantRefInputSchema.validate(toJson());
}

/// Validador de [SuspendTenantInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SuspendTenantInputSchema {
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
      final value243 = json['tenantId'];
      if (value243 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value243)) {
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
      final value244 = json['reason'];
      if (value244 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reason'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value244.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value244.length > 200) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'tenantId', 'reason'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [SuspendTenantInput] contra su contrato.
extension SuspendTenantInputValidation on SuspendTenantInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SuspendTenantInputSchema.validate(toJson());
}

/// Validador de [MemberSummary] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class MemberSummarySchema {
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
      final value245 = json['userId'];
      if (value245 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value245)) {
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
    if (json.containsKey('email')) {
      final value246 = json['email'];
      if (value246 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value246.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value246)) {
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
    if (json.containsKey('displayName')) {
      final value247 = json['displayName'];
      if (value247 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'displayName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value247.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value247.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'displayName'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('groupIds')) {
      final value248 = json['groupIds'];
      if (value248 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groupIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value248.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'groupIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i249 = 0; i249 < value248.length; i249++) {
          final item250 = value248[i249];
          if (item250 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groupIds'), '$i249'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item250)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groupIds'), '$i249'),
                PlatformErrorCode.validationInvalidFormat.code,
              );
            }
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'groupIds'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('joinedAt')) {
      final value251 = json['joinedAt'];
      if (value251 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'joinedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value251)) {
          addFieldError(
            errors,
            joinPath(path, 'joinedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'joinedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [MemberSummary] contra su contrato.
extension MemberSummaryValidation on MemberSummary {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => MemberSummarySchema.validate(toJson());
}

/// Validador de [MemberPage] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class MemberPageSchema {
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
      final value252 = json['items'];
      if (value252 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value252.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i253 = 0; i253 < value252.length; i253++) {
          final item254 = value252[i253];
          MemberSummarySchema.check(
            item254,
            joinPath(joinPath(path, 'items'), '$i253'),
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
      final value255 = json['nextCursor'];
      if (value255 != null) {
        if (value255 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value255.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value255.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern5.hasMatch(value255)) {
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

/// Validación de [MemberPage] contra su contrato.
extension MemberPageValidation on MemberPage {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => MemberPageSchema.validate(toJson());
}

/// Validador de [RemoveMemberRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class RemoveMemberRequestSchema {
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
      final value256 = json['userId'];
      if (value256 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value256)) {
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
    for (final key in json.keys) {
      if (!const <String>{'userId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [RemoveMemberRequest] contra su contrato.
extension RemoveMemberRequestValidation on RemoveMemberRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => RemoveMemberRequestSchema.validate(toJson());
}

/// Validador de [SetMemberGroupsRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SetMemberGroupsRequestSchema {
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
      final value257 = json['userId'];
      if (value257 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value257)) {
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
    if (json.containsKey('groupIds')) {
      final value258 = json['groupIds'];
      if (value258 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groupIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value258.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'groupIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i259 = 0; i259 < value258.length; i259++) {
          final item260 = value258[i259];
          if (item260 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groupIds'), '$i259'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item260)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groupIds'), '$i259'),
                PlatformErrorCode.validationInvalidFormat.code,
              );
            }
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'groupIds'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'userId', 'groupIds'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [SetMemberGroupsRequest] contra su contrato.
extension SetMemberGroupsRequestValidation on SetMemberGroupsRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      SetMemberGroupsRequestSchema.validate(toJson());
}

/// Validador de [GroupSummary] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class GroupSummarySchema {
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
      final value261 = json['id'];
      if (value261 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value261)) {
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
      final value262 = json['name'];
      if (value262 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value262.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value262.length > 80) {
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
    if (json.containsKey('system')) {
      final value263 = json['system'];
      if (value263 is! bool) {
        addFieldError(
          errors,
          joinPath(path, 'system'),
          PlatformErrorCode.validationInvalidType.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'system'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('roleIds')) {
      final value264 = json['roleIds'];
      if (value264 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'roleIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value264.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'roleIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i265 = 0; i265 < value264.length; i265++) {
          final item266 = value264[i265];
          if (item266 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'roleIds'), '$i265'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item266)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roleIds'), '$i265'),
                PlatformErrorCode.validationInvalidFormat.code,
              );
            }
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'roleIds'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('memberCount')) {
      final value267 = json['memberCount'];
      if (value267 is! num ||
          !value267.isFinite ||
          value267 != value267.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'memberCount'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value267 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'memberCount'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value267 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'memberCount'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'memberCount'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [GroupSummary] contra su contrato.
extension GroupSummaryValidation on GroupSummary {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => GroupSummarySchema.validate(toJson());
}

/// Validador de [GroupPage] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class GroupPageSchema {
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
      final value268 = json['items'];
      if (value268 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value268.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i269 = 0; i269 < value268.length; i269++) {
          final item270 = value268[i269];
          GroupSummarySchema.check(
            item270,
            joinPath(joinPath(path, 'items'), '$i269'),
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
      final value271 = json['nextCursor'];
      if (value271 != null) {
        if (value271 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value271.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value271.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern5.hasMatch(value271)) {
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

/// Validación de [GroupPage] contra su contrato.
extension GroupPageValidation on GroupPage {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => GroupPageSchema.validate(toJson());
}

/// Validador de [CreateGroupRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class CreateGroupRequestSchema {
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
      final value272 = json['name'];
      if (value272 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value272.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value272.length > 80) {
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
    for (final key in json.keys) {
      if (!const <String>{'name'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [CreateGroupRequest] contra su contrato.
extension CreateGroupRequestValidation on CreateGroupRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => CreateGroupRequestSchema.validate(toJson());
}

/// Validador de [UpdateGroupRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UpdateGroupRequestSchema {
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
    if (json.containsKey('groupId')) {
      final value273 = json['groupId'];
      if (value273 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'groupId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value273)) {
          addFieldError(
            errors,
            joinPath(path, 'groupId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'groupId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('name')) {
      final value274 = json['name'];
      if (value274 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value274.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value274.length > 80) {
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
    for (final key in json.keys) {
      if (!const <String>{'groupId', 'name'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [UpdateGroupRequest] contra su contrato.
extension UpdateGroupRequestValidation on UpdateGroupRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => UpdateGroupRequestSchema.validate(toJson());
}

/// Validador de [DeleteGroupRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class DeleteGroupRequestSchema {
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
    if (json.containsKey('groupId')) {
      final value275 = json['groupId'];
      if (value275 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'groupId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value275)) {
          addFieldError(
            errors,
            joinPath(path, 'groupId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'groupId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'groupId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [DeleteGroupRequest] contra su contrato.
extension DeleteGroupRequestValidation on DeleteGroupRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => DeleteGroupRequestSchema.validate(toJson());
}

/// Validador de [SetGroupRolesRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SetGroupRolesRequestSchema {
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
    if (json.containsKey('groupId')) {
      final value276 = json['groupId'];
      if (value276 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'groupId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value276)) {
          addFieldError(
            errors,
            joinPath(path, 'groupId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'groupId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('roleIds')) {
      final value277 = json['roleIds'];
      if (value277 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'roleIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value277.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'roleIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i278 = 0; i278 < value277.length; i278++) {
          final item279 = value277[i278];
          if (item279 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'roleIds'), '$i278'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item279)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roleIds'), '$i278'),
                PlatformErrorCode.validationInvalidFormat.code,
              );
            }
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'roleIds'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'groupId', 'roleIds'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [SetGroupRolesRequest] contra su contrato.
extension SetGroupRolesRequestValidation on SetGroupRolesRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SetGroupRolesRequestSchema.validate(toJson());
}

/// Validador de [RoleSummary] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class RoleSummarySchema {
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
      final value280 = json['id'];
      if (value280 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value280)) {
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
      final value281 = json['name'];
      if (value281 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value281.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value281.length > 80) {
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
    if (json.containsKey('systemRole')) {
      final value282 = json['systemRole'];
      if (value282 != null) {
        if (value282 is! String ||
            !const <String>{
              'owner',
              'admin',
              'member',
              'billing',
            }.contains(value282)) {
          addFieldError(
            errors,
            joinPath(path, 'systemRole'),
            PlatformErrorCode.validationInvalidEnum.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'systemRole'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('permissions')) {
      final value283 = json['permissions'];
      if (value283 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value283.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i284 = 0; i284 < value283.length; i284++) {
          final item285 = value283[i284];
          if (item285 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item285))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i284'),
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
  }
}

/// Validación de [RoleSummary] contra su contrato.
extension RoleSummaryValidation on RoleSummary {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => RoleSummarySchema.validate(toJson());
}

/// Validador de [RolePage] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class RolePageSchema {
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
      final value286 = json['items'];
      if (value286 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value286.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i287 = 0; i287 < value286.length; i287++) {
          final item288 = value286[i287];
          RoleSummarySchema.check(
            item288,
            joinPath(joinPath(path, 'items'), '$i287'),
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
      final value289 = json['nextCursor'];
      if (value289 != null) {
        if (value289 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value289.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value289.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern5.hasMatch(value289)) {
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

/// Validación de [RolePage] contra su contrato.
extension RolePageValidation on RolePage {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => RolePageSchema.validate(toJson());
}

/// Validador de [CreateRoleRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class CreateRoleRequestSchema {
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
      final value290 = json['name'];
      if (value290 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value290.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value290.length > 80) {
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
    if (json.containsKey('permissions')) {
      final value291 = json['permissions'];
      if (value291 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value291.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i292 = 0; i292 < value291.length; i292++) {
          final item293 = value291[i292];
          if (item293 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item293))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i292'),
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
    for (final key in json.keys) {
      if (!const <String>{'name', 'permissions'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [CreateRoleRequest] contra su contrato.
extension CreateRoleRequestValidation on CreateRoleRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => CreateRoleRequestSchema.validate(toJson());
}

/// Validador de [UpdateRoleRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UpdateRoleRequestSchema {
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
    if (json.containsKey('roleId')) {
      final value294 = json['roleId'];
      if (value294 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'roleId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value294)) {
          addFieldError(
            errors,
            joinPath(path, 'roleId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'roleId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('name')) {
      final value295 = json['name'];
      if (value295 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value295.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value295.length > 80) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('permissions')) {
      final value296 = json['permissions'];
      if (value296 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value296.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i297 = 0; i297 < value296.length; i297++) {
          final item298 = value296[i297];
          if (item298 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item298))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i297'),
              PlatformErrorCode.validationInvalidEnum.code,
            );
          }
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'roleId', 'name', 'permissions'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [UpdateRoleRequest] contra su contrato.
extension UpdateRoleRequestValidation on UpdateRoleRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => UpdateRoleRequestSchema.validate(toJson());
}

/// Validador de [DeleteRoleRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class DeleteRoleRequestSchema {
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
    if (json.containsKey('roleId')) {
      final value299 = json['roleId'];
      if (value299 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'roleId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value299)) {
          addFieldError(
            errors,
            joinPath(path, 'roleId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'roleId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'roleId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [DeleteRoleRequest] contra su contrato.
extension DeleteRoleRequestValidation on DeleteRoleRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => DeleteRoleRequestSchema.validate(toJson());
}

/// Validador de [InvitationSummary] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class InvitationSummarySchema {
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
      final value300 = json['id'];
      if (value300 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value300)) {
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
    if (json.containsKey('email')) {
      final value301 = json['email'];
      if (value301 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value301.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value301)) {
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
    if (json.containsKey('groupIds')) {
      final value302 = json['groupIds'];
      if (value302 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groupIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value302.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'groupIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i303 = 0; i303 < value302.length; i303++) {
          final item304 = value302[i303];
          if (item304 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groupIds'), '$i303'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item304)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groupIds'), '$i303'),
                PlatformErrorCode.validationInvalidFormat.code,
              );
            }
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'groupIds'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value305 = json['status'];
      if (value305 is! String ||
          !const <String>{
            'pending',
            'accepted',
            'revoked',
            'expired',
          }.contains(value305)) {
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
    if (json.containsKey('expiresAt')) {
      final value306 = json['expiresAt'];
      if (value306 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'expiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value306)) {
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
    if (json.containsKey('invitedBy')) {
      final value307 = json['invitedBy'];
      if (value307 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invitedBy'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value307)) {
          addFieldError(
            errors,
            joinPath(path, 'invitedBy'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'invitedBy'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [InvitationSummary] contra su contrato.
extension InvitationSummaryValidation on InvitationSummary {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => InvitationSummarySchema.validate(toJson());
}

/// Validador de [InvitationPage] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class InvitationPageSchema {
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
      final value308 = json['items'];
      if (value308 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value308.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i309 = 0; i309 < value308.length; i309++) {
          final item310 = value308[i309];
          InvitationSummarySchema.check(
            item310,
            joinPath(joinPath(path, 'items'), '$i309'),
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
      final value311 = json['nextCursor'];
      if (value311 != null) {
        if (value311 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value311.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value311.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern5.hasMatch(value311)) {
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

/// Validación de [InvitationPage] contra su contrato.
extension InvitationPageValidation on InvitationPage {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => InvitationPageSchema.validate(toJson());
}

/// Validador de [InviteUserRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class InviteUserRequestSchema {
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
    if (json.containsKey('email')) {
      final value312 = json['email'];
      if (value312 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value312.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value312)) {
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
    if (json.containsKey('groupIds')) {
      final value313 = json['groupIds'];
      if (value313 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groupIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value313.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'groupIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i314 = 0; i314 < value313.length; i314++) {
          final item315 = value313[i314];
          if (item315 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groupIds'), '$i314'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item315)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groupIds'), '$i314'),
                PlatformErrorCode.validationInvalidFormat.code,
              );
            }
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'groupIds'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'email', 'groupIds'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [InviteUserRequest] contra su contrato.
extension InviteUserRequestValidation on InviteUserRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => InviteUserRequestSchema.validate(toJson());
}

/// Validador de [RevokeInvitationRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class RevokeInvitationRequestSchema {
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
    if (json.containsKey('invitationId')) {
      final value316 = json['invitationId'];
      if (value316 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invitationId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value316)) {
          addFieldError(
            errors,
            joinPath(path, 'invitationId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'invitationId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'invitationId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [RevokeInvitationRequest] contra su contrato.
extension RevokeInvitationRequestValidation on RevokeInvitationRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      RevokeInvitationRequestSchema.validate(toJson());
}

/// Validador de [AcceptInvitationRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class AcceptInvitationRequestSchema {
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
    if (json.containsKey('token')) {
      final value317 = json['token'];
      if (value317 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'token'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value317.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value317.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'token'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'token'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [AcceptInvitationRequest] contra su contrato.
extension AcceptInvitationRequestValidation on AcceptInvitationRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      AcceptInvitationRequestSchema.validate(toJson());
}

/// Validador de [ServiceAccountSummary] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ServiceAccountSummarySchema {
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
      final value318 = json['id'];
      if (value318 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value318)) {
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
      final value319 = json['name'];
      if (value319 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value319.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value319.length > 120) {
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
    if (json.containsKey('permissions')) {
      final value320 = json['permissions'];
      if (value320 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value320.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i321 = 0; i321 < value320.length; i321++) {
          final item322 = value320[i321];
          if (item322 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item322))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i321'),
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
    if (json.containsKey('status')) {
      final value323 = json['status'];
      if (value323 is! String ||
          !const <String>{'active', 'disabled'}.contains(value323)) {
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
    if (json.containsKey('pinnedApiVersion')) {
      final value324 = json['pinnedApiVersion'];
      if (value324 != null) {
        if (value324 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'pinnedApiVersion'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value324.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'pinnedApiVersion'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value324.length > 16) {
            addFieldError(
              errors,
              joinPath(path, 'pinnedApiVersion'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'pinnedApiVersion'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdAt')) {
      final value325 = json['createdAt'];
      if (value325 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value325)) {
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

/// Validación de [ServiceAccountSummary] contra su contrato.
extension ServiceAccountSummaryValidation on ServiceAccountSummary {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => ServiceAccountSummarySchema.validate(toJson());
}

/// Validador de [ServiceAccountPage] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ServiceAccountPageSchema {
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
      final value326 = json['items'];
      if (value326 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value326.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i327 = 0; i327 < value326.length; i327++) {
          final item328 = value326[i327];
          ServiceAccountSummarySchema.check(
            item328,
            joinPath(joinPath(path, 'items'), '$i327'),
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
      final value329 = json['nextCursor'];
      if (value329 != null) {
        if (value329 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value329.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value329.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern5.hasMatch(value329)) {
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

/// Validación de [ServiceAccountPage] contra su contrato.
extension ServiceAccountPageValidation on ServiceAccountPage {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => ServiceAccountPageSchema.validate(toJson());
}

/// Validador de [CreateServiceAccountRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class CreateServiceAccountRequestSchema {
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
      final value330 = json['name'];
      if (value330 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value330.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value330.length > 120) {
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
    if (json.containsKey('permissions')) {
      final value331 = json['permissions'];
      if (value331 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value331.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i332 = 0; i332 < value331.length; i332++) {
          final item333 = value331[i332];
          if (item333 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item333))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i332'),
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
    if (json.containsKey('pinnedApiVersion')) {
      final value334 = json['pinnedApiVersion'];
      if (value334 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'pinnedApiVersion'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value334.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'pinnedApiVersion'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value334.length > 16) {
          addFieldError(
            errors,
            joinPath(path, 'pinnedApiVersion'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{
        'name',
        'permissions',
        'pinnedApiVersion',
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

/// Validación de [CreateServiceAccountRequest] contra su contrato.
extension CreateServiceAccountRequestValidation on CreateServiceAccountRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      CreateServiceAccountRequestSchema.validate(toJson());
}

/// Validador de [UpdateServiceAccountRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UpdateServiceAccountRequestSchema {
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
    if (json.containsKey('serviceAccountId')) {
      final value335 = json['serviceAccountId'];
      if (value335 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value335)) {
          addFieldError(
            errors,
            joinPath(path, 'serviceAccountId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'serviceAccountId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('name')) {
      final value336 = json['name'];
      if (value336 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value336.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value336.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('permissions')) {
      final value337 = json['permissions'];
      if (value337 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value337.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i338 = 0; i338 < value337.length; i338++) {
          final item339 = value337[i338];
          if (item339 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item339))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i338'),
              PlatformErrorCode.validationInvalidEnum.code,
            );
          }
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{
        'serviceAccountId',
        'name',
        'permissions',
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

/// Validación de [UpdateServiceAccountRequest] contra su contrato.
extension UpdateServiceAccountRequestValidation on UpdateServiceAccountRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      UpdateServiceAccountRequestSchema.validate(toJson());
}

/// Validador de [DeleteServiceAccountRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class DeleteServiceAccountRequestSchema {
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
    if (json.containsKey('serviceAccountId')) {
      final value340 = json['serviceAccountId'];
      if (value340 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value340)) {
          addFieldError(
            errors,
            joinPath(path, 'serviceAccountId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'serviceAccountId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'serviceAccountId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [DeleteServiceAccountRequest] contra su contrato.
extension DeleteServiceAccountRequestValidation on DeleteServiceAccountRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      DeleteServiceAccountRequestSchema.validate(toJson());
}

/// Validador de [ApiKeySummary] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ApiKeySummarySchema {
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
      final value341 = json['id'];
      if (value341 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value341)) {
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
    if (json.containsKey('serviceAccountId')) {
      final value342 = json['serviceAccountId'];
      if (value342 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value342)) {
          addFieldError(
            errors,
            joinPath(path, 'serviceAccountId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'serviceAccountId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('prefix')) {
      final value343 = json['prefix'];
      if (value343 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'prefix'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value343.length < 12) {
          addFieldError(
            errors,
            joinPath(path, 'prefix'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value343.length > 12) {
          addFieldError(
            errors,
            joinPath(path, 'prefix'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern10.hasMatch(value343)) {
          addFieldError(
            errors,
            joinPath(path, 'prefix'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'prefix'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('environment')) {
      final value344 = json['environment'];
      if (value344 is! String ||
          !const <String>{'live', 'test'}.contains(value344)) {
        addFieldError(
          errors,
          joinPath(path, 'environment'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'environment'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value345 = json['status'];
      if (value345 is! String ||
          !const <String>{'active', 'rotated', 'revoked'}.contains(value345)) {
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
    if (json.containsKey('expiresAt')) {
      final value346 = json['expiresAt'];
      if (value346 != null) {
        if (value346 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'expiresAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern3.hasMatch(value346)) {
            addFieldError(
              errors,
              joinPath(path, 'expiresAt'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'expiresAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('validUntil')) {
      final value347 = json['validUntil'];
      if (value347 != null) {
        if (value347 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'validUntil'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern3.hasMatch(value347)) {
            addFieldError(
              errors,
              joinPath(path, 'validUntil'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'validUntil'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('allowedCidrs')) {
      final value348 = json['allowedCidrs'];
      if (value348 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'allowedCidrs'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value348.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'allowedCidrs'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i349 = 0; i349 < value348.length; i349++) {
          final item350 = value348[i349];
          if (item350 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'allowedCidrs'), '$i349'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item350.isEmpty) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'allowedCidrs'), '$i349'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item350.length > 64) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'allowedCidrs'), '$i349'),
                PlatformErrorCode.validationTooLong.code,
              );
            }
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'allowedCidrs'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('lastUsedAt')) {
      final value351 = json['lastUsedAt'];
      if (value351 != null) {
        if (value351 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'lastUsedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern3.hasMatch(value351)) {
            addFieldError(
              errors,
              joinPath(path, 'lastUsedAt'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'lastUsedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdAt')) {
      final value352 = json['createdAt'];
      if (value352 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value352)) {
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

/// Validación de [ApiKeySummary] contra su contrato.
extension ApiKeySummaryValidation on ApiKeySummary {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => ApiKeySummarySchema.validate(toJson());
}

/// Validador de [ApiKeyPage] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ApiKeyPageSchema {
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
      final value353 = json['items'];
      if (value353 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value353.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i354 = 0; i354 < value353.length; i354++) {
          final item355 = value353[i354];
          ApiKeySummarySchema.check(
            item355,
            joinPath(joinPath(path, 'items'), '$i354'),
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
      final value356 = json['nextCursor'];
      if (value356 != null) {
        if (value356 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value356.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value356.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern5.hasMatch(value356)) {
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

/// Validación de [ApiKeyPage] contra su contrato.
extension ApiKeyPageValidation on ApiKeyPage {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => ApiKeyPageSchema.validate(toJson());
}

/// Validador de [ListApiKeysRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ListApiKeysRequestSchema {
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
    if (json.containsKey('serviceAccountId')) {
      final value357 = json['serviceAccountId'];
      if (value357 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value357)) {
          addFieldError(
            errors,
            joinPath(path, 'serviceAccountId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'serviceAccountId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('limit')) {
      final value358 = json['limit'];
      if (value358 is! num ||
          !value358.isFinite ||
          value358 != value358.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'limit'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value358 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value358 > 100) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    }
    if (json.containsKey('after')) {
      final value359 = json['after'];
      if (value359 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'after'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value359.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value359.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value359)) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'serviceAccountId', 'limit', 'after'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [ListApiKeysRequest] contra su contrato.
extension ListApiKeysRequestValidation on ListApiKeysRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => ListApiKeysRequestSchema.validate(toJson());
}

/// Validador de [CreateApiKeyRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class CreateApiKeyRequestSchema {
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
    if (json.containsKey('serviceAccountId')) {
      final value360 = json['serviceAccountId'];
      if (value360 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value360)) {
          addFieldError(
            errors,
            joinPath(path, 'serviceAccountId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'serviceAccountId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('environment')) {
      final value361 = json['environment'];
      if (value361 is! String ||
          !const <String>{'live', 'test'}.contains(value361)) {
        addFieldError(
          errors,
          joinPath(path, 'environment'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'environment'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('expiresAt')) {
      final value362 = json['expiresAt'];
      if (value362 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'expiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value362)) {
          addFieldError(
            errors,
            joinPath(path, 'expiresAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    if (json.containsKey('allowedCidrs')) {
      final value363 = json['allowedCidrs'];
      if (value363 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'allowedCidrs'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value363.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'allowedCidrs'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i364 = 0; i364 < value363.length; i364++) {
          final item365 = value363[i364];
          if (item365 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'allowedCidrs'), '$i364'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item365.isEmpty) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'allowedCidrs'), '$i364'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item365.length > 64) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'allowedCidrs'), '$i364'),
                PlatformErrorCode.validationTooLong.code,
              );
            }
          }
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{
        'serviceAccountId',
        'environment',
        'expiresAt',
        'allowedCidrs',
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

/// Validación de [CreateApiKeyRequest] contra su contrato.
extension CreateApiKeyRequestValidation on CreateApiKeyRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => CreateApiKeyRequestSchema.validate(toJson());
}

/// Validador de [CreatedApiKey] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class CreatedApiKeySchema {
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
    if (json.containsKey('apiKey')) {
      final value366 = json['apiKey'];
      ApiKeySummarySchema.check(
        value366,
        joinPath(path, 'apiKey'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'apiKey'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('secret')) {
      final value367 = json['secret'];
      if (value367 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'secret'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value367.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'secret'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value367.length > 128) {
          addFieldError(
            errors,
            joinPath(path, 'secret'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'secret'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [CreatedApiKey] contra su contrato.
extension CreatedApiKeyValidation on CreatedApiKey {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => CreatedApiKeySchema.validate(toJson());
}

/// Validador de [RotateApiKeyRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class RotateApiKeyRequestSchema {
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
    if (json.containsKey('apiKeyId')) {
      final value368 = json['apiKeyId'];
      if (value368 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value368)) {
          addFieldError(
            errors,
            joinPath(path, 'apiKeyId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'apiKeyId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'apiKeyId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [RotateApiKeyRequest] contra su contrato.
extension RotateApiKeyRequestValidation on RotateApiKeyRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => RotateApiKeyRequestSchema.validate(toJson());
}

/// Validador de [RevokeApiKeyRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class RevokeApiKeyRequestSchema {
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
    if (json.containsKey('apiKeyId')) {
      final value369 = json['apiKeyId'];
      if (value369 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value369)) {
          addFieldError(
            errors,
            joinPath(path, 'apiKeyId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'apiKeyId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'apiKeyId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [RevokeApiKeyRequest] contra su contrato.
extension RevokeApiKeyRequestValidation on RevokeApiKeyRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => RevokeApiKeyRequestSchema.validate(toJson());
}

/// Validador de [AuthenticateApiKeyInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class AuthenticateApiKeyInputSchema {
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
    if (json.containsKey('apiKey')) {
      final value370 = json['apiKey'];
      if (value370 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKey'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value370.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'apiKey'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value370.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'apiKey'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'apiKey'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('clientIp')) {
      final value371 = json['clientIp'];
      if (value371 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'clientIp'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value371.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'clientIp'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value371.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'clientIp'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'apiKey', 'clientIp'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [AuthenticateApiKeyInput] contra su contrato.
extension AuthenticateApiKeyInputValidation on AuthenticateApiKeyInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      AuthenticateApiKeyInputSchema.validate(toJson());
}

/// Validador de [ApiKeyPrincipal] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ApiKeyPrincipalSchema {
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
    if (json.containsKey('apiKeyId')) {
      final value372 = json['apiKeyId'];
      if (value372 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value372)) {
          addFieldError(
            errors,
            joinPath(path, 'apiKeyId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'apiKeyId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('serviceAccountId')) {
      final value373 = json['serviceAccountId'];
      if (value373 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value373)) {
          addFieldError(
            errors,
            joinPath(path, 'serviceAccountId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'serviceAccountId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('tenantId')) {
      final value374 = json['tenantId'];
      if (value374 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value374)) {
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
    if (json.containsKey('permissions')) {
      final value375 = json['permissions'];
      if (value375 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value375.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i376 = 0; i376 < value375.length; i376++) {
          final item377 = value375[i376];
          if (item377 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item377))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i376'),
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
    if (json.containsKey('environment')) {
      final value378 = json['environment'];
      if (value378 is! String ||
          !const <String>{'live', 'test'}.contains(value378)) {
        addFieldError(
          errors,
          joinPath(path, 'environment'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'environment'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('expiresAt')) {
      final value379 = json['expiresAt'];
      if (value379 != null) {
        if (value379 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'expiresAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern3.hasMatch(value379)) {
            addFieldError(
              errors,
              joinPath(path, 'expiresAt'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'expiresAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('pinnedApiVersion')) {
      final value380 = json['pinnedApiVersion'];
      if (value380 != null) {
        if (value380 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'pinnedApiVersion'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value380.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'pinnedApiVersion'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value380.length > 16) {
            addFieldError(
              errors,
              joinPath(path, 'pinnedApiVersion'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'pinnedApiVersion'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [ApiKeyPrincipal] contra su contrato.
extension ApiKeyPrincipalValidation on ApiKeyPrincipal {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => ApiKeyPrincipalSchema.validate(toJson());
}

/// Validador de [Jwk] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class JwkSchema {
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
    if (json.containsKey('kty')) {
      final value381 = json['kty'];
      if (value381 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'kty'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value381.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'kty'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value381.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'kty'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'kty'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('crv')) {
      final value382 = json['crv'];
      if (value382 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'crv'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value382.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'crv'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value382.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'crv'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'crv'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('kid')) {
      final value383 = json['kid'];
      if (value383 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'kid'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value383.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'kid'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value383.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'kid'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'kid'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('use')) {
      final value384 = json['use'];
      if (value384 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'use'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value384.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'use'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value384.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'use'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'use'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('alg')) {
      final value385 = json['alg'];
      if (value385 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'alg'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value385.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'alg'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value385.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'alg'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'alg'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('x')) {
      final value386 = json['x'];
      if (value386 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'x'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value386.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'x'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value386.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'x'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'x'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('y')) {
      final value387 = json['y'];
      if (value387 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'y'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value387.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'y'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value387.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'y'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'y'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [Jwk] contra su contrato.
extension JwkValidation on Jwk {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => JwkSchema.validate(toJson());
}

/// Validador de [Jwks] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class JwksSchema {
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
    if (json.containsKey('keys')) {
      final value388 = json['keys'];
      if (value388 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'keys'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value388.length > 10) {
          addFieldError(
            errors,
            joinPath(path, 'keys'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i389 = 0; i389 < value388.length; i389++) {
          final item390 = value388[i389];
          JwkSchema.check(
            item390,
            joinPath(joinPath(path, 'keys'), '$i389'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'keys'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [Jwks] contra su contrato.
extension JwksValidation on Jwks {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => JwksSchema.validate(toJson());
}

/// Validador de [UserRegisteredPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UserRegisteredPayloadSchema {
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
      final value391 = json['userId'];
      if (value391 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value391)) {
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
      final value392 = json['homeTenantId'];
      if (value392 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'homeTenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value392)) {
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
    if (json.containsKey('registeredAt')) {
      final value393 = json['registeredAt'];
      if (value393 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'registeredAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value393)) {
          addFieldError(
            errors,
            joinPath(path, 'registeredAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'registeredAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [UserRegisteredPayload] contra su contrato.
extension UserRegisteredPayloadValidation on UserRegisteredPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => UserRegisteredPayloadSchema.validate(toJson());
}

/// Validador de [UserSuspendedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UserSuspendedPayloadSchema {
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
      final value394 = json['userId'];
      if (value394 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value394)) {
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
      final value395 = json['reason'];
      if (value395 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reason'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value395.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value395.length > 200) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('suspendedAt')) {
      final value396 = json['suspendedAt'];
      if (value396 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'suspendedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value396)) {
          addFieldError(
            errors,
            joinPath(path, 'suspendedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'suspendedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [UserSuspendedPayload] contra su contrato.
extension UserSuspendedPayloadValidation on UserSuspendedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => UserSuspendedPayloadSchema.validate(toJson());
}

/// Validador de [UserReactivatedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UserReactivatedPayloadSchema {
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
      final value397 = json['userId'];
      if (value397 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value397)) {
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
    if (json.containsKey('reactivatedAt')) {
      final value398 = json['reactivatedAt'];
      if (value398 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reactivatedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value398)) {
          addFieldError(
            errors,
            joinPath(path, 'reactivatedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'reactivatedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [UserReactivatedPayload] contra su contrato.
extension UserReactivatedPayloadValidation on UserReactivatedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      UserReactivatedPayloadSchema.validate(toJson());
}

/// Validador de [UserEmailChangedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UserEmailChangedPayloadSchema {
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
      final value399 = json['userId'];
      if (value399 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value399)) {
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
    if (json.containsKey('changedAt')) {
      final value400 = json['changedAt'];
      if (value400 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'changedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value400)) {
          addFieldError(
            errors,
            joinPath(path, 'changedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'changedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [UserEmailChangedPayload] contra su contrato.
extension UserEmailChangedPayloadValidation on UserEmailChangedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      UserEmailChangedPayloadSchema.validate(toJson());
}

/// Validador de [DeviceRegisteredPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class DeviceRegisteredPayloadSchema {
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
      final value401 = json['userId'];
      if (value401 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value401)) {
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
    if (json.containsKey('deviceId')) {
      final value402 = json['deviceId'];
      if (value402 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value402)) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'deviceId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('platform')) {
      final value403 = json['platform'];
      if (value403 is! String ||
          !const <String>{
            'ios',
            'android',
            'web',
            'macos',
            'windows',
            'linux',
          }.contains(value403)) {
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
    if (json.containsKey('verifier')) {
      final value404 = json['verifier'];
      if (value404 is! bool) {
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
    if (json.containsKey('registeredAt')) {
      final value405 = json['registeredAt'];
      if (value405 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'registeredAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value405)) {
          addFieldError(
            errors,
            joinPath(path, 'registeredAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'registeredAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [DeviceRegisteredPayload] contra su contrato.
extension DeviceRegisteredPayloadValidation on DeviceRegisteredPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      DeviceRegisteredPayloadSchema.validate(toJson());
}

/// Validador de [DeviceRemovedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class DeviceRemovedPayloadSchema {
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
      final value406 = json['userId'];
      if (value406 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value406)) {
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
    if (json.containsKey('deviceId')) {
      final value407 = json['deviceId'];
      if (value407 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value407)) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'deviceId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('removedAt')) {
      final value408 = json['removedAt'];
      if (value408 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'removedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value408)) {
          addFieldError(
            errors,
            joinPath(path, 'removedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'removedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [DeviceRemovedPayload] contra su contrato.
extension DeviceRemovedPayloadValidation on DeviceRemovedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => DeviceRemovedPayloadSchema.validate(toJson());
}

/// Validador de [TenantCreatedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TenantCreatedPayloadSchema {
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
      final value409 = json['tenantId'];
      if (value409 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value409)) {
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
    if (json.containsKey('slug')) {
      final value410 = json['slug'];
      if (value410 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'slug'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value410.length < 3) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value410.length > 63) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'slug'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('kind')) {
      final value411 = json['kind'];
      if (value411 is! String ||
          !const <String>{
            'organization',
            'shared_customers',
            'platform',
          }.contains(value411)) {
        addFieldError(
          errors,
          joinPath(path, 'kind'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'kind'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('region')) {
      final value412 = json['region'];
      if (value412 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value412.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value412.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'region'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('ownerUserId')) {
      final value413 = json['ownerUserId'];
      if (value413 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'ownerUserId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value413)) {
          addFieldError(
            errors,
            joinPath(path, 'ownerUserId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'ownerUserId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdAt')) {
      final value414 = json['createdAt'];
      if (value414 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value414)) {
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

/// Validación de [TenantCreatedPayload] contra su contrato.
extension TenantCreatedPayloadValidation on TenantCreatedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TenantCreatedPayloadSchema.validate(toJson());
}

/// Validador de [TenantSuspendedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TenantSuspendedPayloadSchema {
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
      final value415 = json['tenantId'];
      if (value415 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value415)) {
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
    if (json.containsKey('suspendedAt')) {
      final value416 = json['suspendedAt'];
      if (value416 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'suspendedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value416)) {
          addFieldError(
            errors,
            joinPath(path, 'suspendedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'suspendedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TenantSuspendedPayload] contra su contrato.
extension TenantSuspendedPayloadValidation on TenantSuspendedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      TenantSuspendedPayloadSchema.validate(toJson());
}

/// Validador de [TenantReactivatedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TenantReactivatedPayloadSchema {
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
      final value417 = json['tenantId'];
      if (value417 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value417)) {
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
    if (json.containsKey('reactivatedAt')) {
      final value418 = json['reactivatedAt'];
      if (value418 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reactivatedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value418)) {
          addFieldError(
            errors,
            joinPath(path, 'reactivatedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'reactivatedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TenantReactivatedPayload] contra su contrato.
extension TenantReactivatedPayloadValidation on TenantReactivatedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      TenantReactivatedPayloadSchema.validate(toJson());
}

/// Validador de [MembershipChangedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class MembershipChangedPayloadSchema {
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
      final value419 = json['tenantId'];
      if (value419 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value419)) {
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
    if (json.containsKey('userId')) {
      final value420 = json['userId'];
      if (value420 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value420)) {
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
    if (json.containsKey('kind')) {
      final value421 = json['kind'];
      if (value421 is! String ||
          !const <String>{
            'added',
            'removed',
            'groups_changed',
          }.contains(value421)) {
        addFieldError(
          errors,
          joinPath(path, 'kind'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'kind'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('groupIds')) {
      final value422 = json['groupIds'];
      if (value422 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groupIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value422.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'groupIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i423 = 0; i423 < value422.length; i423++) {
          final item424 = value422[i423];
          if (item424 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groupIds'), '$i423'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item424)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groupIds'), '$i423'),
                PlatformErrorCode.validationInvalidFormat.code,
              );
            }
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'groupIds'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('changedAt')) {
      final value425 = json['changedAt'];
      if (value425 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'changedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value425)) {
          addFieldError(
            errors,
            joinPath(path, 'changedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'changedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [MembershipChangedPayload] contra su contrato.
extension MembershipChangedPayloadValidation on MembershipChangedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      MembershipChangedPayloadSchema.validate(toJson());
}

/// Validador de [PermissionsChangedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PermissionsChangedPayloadSchema {
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
      final value426 = json['tenantId'];
      if (value426 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value426)) {
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
    if (json.containsKey('userId')) {
      final value427 = json['userId'];
      if (value427 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value427)) {
          addFieldError(
            errors,
            joinPath(path, 'userId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    if (json.containsKey('permissionVersion')) {
      final value428 = json['permissionVersion'];
      if (value428 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'permissionVersion'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value428.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'permissionVersion'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value428)) {
          addFieldError(
            errors,
            joinPath(path, 'permissionVersion'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'permissionVersion'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('changedAt')) {
      final value429 = json['changedAt'];
      if (value429 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'changedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value429)) {
          addFieldError(
            errors,
            joinPath(path, 'changedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'changedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [PermissionsChangedPayload] contra su contrato.
extension PermissionsChangedPayloadValidation on PermissionsChangedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      PermissionsChangedPayloadSchema.validate(toJson());
}

/// Validador de [ApiKeyCreatedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ApiKeyCreatedPayloadSchema {
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
    if (json.containsKey('apiKeyId')) {
      final value430 = json['apiKeyId'];
      if (value430 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value430)) {
          addFieldError(
            errors,
            joinPath(path, 'apiKeyId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'apiKeyId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('serviceAccountId')) {
      final value431 = json['serviceAccountId'];
      if (value431 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value431)) {
          addFieldError(
            errors,
            joinPath(path, 'serviceAccountId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'serviceAccountId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('tenantId')) {
      final value432 = json['tenantId'];
      if (value432 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value432)) {
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
    if (json.containsKey('prefix')) {
      final value433 = json['prefix'];
      if (value433 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'prefix'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value433.length < 12) {
          addFieldError(
            errors,
            joinPath(path, 'prefix'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value433.length > 12) {
          addFieldError(
            errors,
            joinPath(path, 'prefix'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'prefix'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('environment')) {
      final value434 = json['environment'];
      if (value434 is! String ||
          !const <String>{'live', 'test'}.contains(value434)) {
        addFieldError(
          errors,
          joinPath(path, 'environment'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'environment'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdBy')) {
      final value435 = json['createdBy'];
      if (value435 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdBy'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value435)) {
          addFieldError(
            errors,
            joinPath(path, 'createdBy'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'createdBy'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdAt')) {
      final value436 = json['createdAt'];
      if (value436 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value436)) {
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

/// Validación de [ApiKeyCreatedPayload] contra su contrato.
extension ApiKeyCreatedPayloadValidation on ApiKeyCreatedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => ApiKeyCreatedPayloadSchema.validate(toJson());
}

/// Validador de [ApiKeyRevokedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ApiKeyRevokedPayloadSchema {
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
    if (json.containsKey('apiKeyId')) {
      final value437 = json['apiKeyId'];
      if (value437 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value437)) {
          addFieldError(
            errors,
            joinPath(path, 'apiKeyId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'apiKeyId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('tenantId')) {
      final value438 = json['tenantId'];
      if (value438 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value438)) {
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
    if (json.containsKey('prefix')) {
      final value439 = json['prefix'];
      if (value439 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'prefix'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value439.length < 12) {
          addFieldError(
            errors,
            joinPath(path, 'prefix'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value439.length > 12) {
          addFieldError(
            errors,
            joinPath(path, 'prefix'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'prefix'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('revokedAt')) {
      final value440 = json['revokedAt'];
      if (value440 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'revokedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value440)) {
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

/// Validación de [ApiKeyRevokedPayload] contra su contrato.
extension ApiKeyRevokedPayloadValidation on ApiKeyRevokedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => ApiKeyRevokedPayloadSchema.validate(toJson());
}

/// Validador de [SecurityAlertRaisedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SecurityAlertRaisedPayloadSchema {
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
    if (json.containsKey('alertId')) {
      final value441 = json['alertId'];
      if (value441 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'alertId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value441)) {
          addFieldError(
            errors,
            joinPath(path, 'alertId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'alertId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('userId')) {
      final value442 = json['userId'];
      if (value442 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value442)) {
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
    if (json.containsKey('type')) {
      final value443 = json['type'];
      if (value443 is! String ||
          !const <String>{
            'new_device_sign_in',
            'verifier_registered',
            'password_changed',
            'password_recovered',
            'mfa_recovery_started',
            'mfa_recovery_completed',
            'email_changed',
            'mfa_factor_removed',
            'recovery_code_used',
            'api_key_created',
            'api_key_revoked',
            'account_locked',
            'protected_mode_enabled',
            'device_approval_denied',
          }.contains(value443)) {
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
    if (json.containsKey('raisedAt')) {
      final value444 = json['raisedAt'];
      if (value444 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'raisedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value444)) {
          addFieldError(
            errors,
            joinPath(path, 'raisedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'raisedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [SecurityAlertRaisedPayload] contra su contrato.
extension SecurityAlertRaisedPayloadValidation on SecurityAlertRaisedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      SecurityAlertRaisedPayloadSchema.validate(toJson());
}
