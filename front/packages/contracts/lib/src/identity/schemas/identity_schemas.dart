// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../identity/types/identity_types.dart';
import '../../platform/enums/platform_enums.dart';
import '../../platform/schemas/platform_schemas.dart';

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
final _pattern4 = RegExp('^https?:\\/\\/');
final _pattern5 = RegExp('^[A-Za-z0-9-]+\$');
final _pattern6 = RegExp('^[A-Za-z0-9_-]+\$');
final _pattern7 = RegExp('^\\d+\\.\\d+\$');
final _pattern8 = RegExp('^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*\$');
final _pattern9 = RegExp('^[0-9]+\$');
final _pattern10 = RegExp('^[a-z0-9]+(-[a-z0-9]+)*\$');
final _pattern11 = RegExp('^[A-Z2-7]+\$');

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
    if (json.containsKey('region')) {
      final value36 = json['region'];
      if (value36 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value36.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value36.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('apiBaseUrl')) {
      final value37 = json['apiBaseUrl'];
      if (value37 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiBaseUrl'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value37.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'apiBaseUrl'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value37.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'apiBaseUrl'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern4.hasMatch(value37)) {
          addFieldError(
            errors,
            joinPath(path, 'apiBaseUrl'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
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
      final value38 = json['mfaToken'];
      if (value38 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value38.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value38.length > 2048) {
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
      final value40 = json['challengeId'];
      if (value40 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value40)) {
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
      final value41 = json['method'];
      if (value41 is! String ||
          !const <String>{
            'device_otp',
            'email_otp',
            'totp',
            'recovery_code',
            'passkey',
          }.contains(value41)) {
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
      final value42 = json['expiresAt'];
      if (value42 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'expiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value42)) {
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
      final value43 = json['codeLength'];
      if (value43 is! num ||
          !value43.isFinite ||
          value43 != value43.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'codeLength'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value43 < 6) {
          addFieldError(
            errors,
            joinPath(path, 'codeLength'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value43 > 64) {
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
      final value44 = json['mfaToken'];
      if (value44 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value44.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value44.length > 2048) {
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
      final value45 = json['challengeId'];
      if (value45 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value45)) {
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
      final value46 = json['code'];
      if (value46 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value46.length < 6) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value46.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value46)) {
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
      final value47 = json['devicePublicKey'];
      if (value47 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'devicePublicKey'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value47.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value47.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value47)) {
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
      final value48 = json['sessionToken'];
      if (value48 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value48.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'sessionToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value48.length > 8192) {
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
      final value49 = json['mfaToken'];
      if (value49 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value49.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value49.length > 2048) {
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
      final value50 = json['challengeId'];
      if (value50 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value50)) {
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
      final value51 = json['code'];
      if (value51 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value51.length < 6) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value51.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value51)) {
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
      final value52 = json['tokens'];
      SessionTokensSchema.check(
        value52,
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
      final value53 = json['mfaVerifiedAt'];
      if (value53 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaVerifiedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value53)) {
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
      final value54 = json['id'];
      if (value54 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value54)) {
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
      final value55 = json['deviceName'];
      if (value55 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value55.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value55.length > 120) {
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
      final value56 = json['platform'];
      if (value56 is! String ||
          !const <String>{
            'ios',
            'android',
            'web',
            'macos',
            'windows',
            'linux',
          }.contains(value56)) {
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
      final value57 = json['lastSeenAt'];
      if (value57 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'lastSeenAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value57)) {
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
      final value58 = json['current'];
      if (value58 is! bool) {
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
      final value59 = json['items'];
      if (value59 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value59.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i60 = 0; i60 < value59.length; i60++) {
          final item61 = value59[i60];
          SessionSummarySchema.check(
            item61,
            joinPath(joinPath(path, 'items'), '$i60'),
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
      final value62 = json['nextCursor'];
      if (value62 != null) {
        if (value62 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value62.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value62.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern6.hasMatch(value62)) {
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
      final value63 = json['id'];
      if (value63 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value63)) {
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
      final value64 = json['name'];
      if (value64 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value64.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value64.length > 120) {
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
      final value65 = json['platform'];
      if (value65 is! String ||
          !const <String>{
            'ios',
            'android',
            'web',
            'macos',
            'windows',
            'linux',
          }.contains(value65)) {
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
      final value66 = json['lastSeenAt'];
      if (value66 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'lastSeenAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value66)) {
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
      final value67 = json['trustedUntil'];
      if (value67 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'trustedUntil'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value67)) {
          addFieldError(
            errors,
            joinPath(path, 'trustedUntil'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    if (json.containsKey('verifier')) {
      final value68 = json['verifier'];
      if (value68 is! bool) {
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
      final value69 = json['items'];
      if (value69 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value69.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i70 = 0; i70 < value69.length; i70++) {
          final item71 = value69[i70];
          DeviceSummarySchema.check(
            item71,
            joinPath(joinPath(path, 'items'), '$i70'),
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
      final value72 = json['nextCursor'];
      if (value72 != null) {
        if (value72 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value72.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value72.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern6.hasMatch(value72)) {
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
      final value73 = json['sessionId'];
      if (value73 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value73)) {
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
      final value74 = json['revoked'];
      if (value74 is! num ||
          !value74.isFinite ||
          value74 != value74.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'revoked'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value74 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'revoked'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value74 > 9007199254740991) {
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
    if (json.containsKey('reason')) {
      final value76 = json['reason'];
      if (value76 is! String ||
          !const <String>{
            'logout',
            'user_action',
            'password_changed',
            'admin_action',
            'compromised',
          }.contains(value76)) {
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
      final value77 = json['userId'];
      if (value77 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value77)) {
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
        if (!_pattern0.hasMatch(value78)) {
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
      final value79 = json['permissions'];
      if (value79 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i80 = 0; i80 < value79.length; i80++) {
          final item81 = value79[i80];
          if (item81 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'reports:read',
                    'reports:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item81))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i80'),
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
      final value82 = json['roles'];
      if (value82 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'roles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value82.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'roles'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i83 = 0; i83 < value82.length; i83++) {
          final item84 = value82[i83];
          if (item84 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'roles'), '$i83'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item84.isEmpty) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roles'), '$i83'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item84.length > 80) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roles'), '$i83'),
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
      final value85 = json['permissionVersion'];
      if (value85 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'permissionVersion'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value85.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'permissionVersion'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern7.hasMatch(value85)) {
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
      final value86 = json['platformRoles'];
      if (value86 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'platformRoles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i87 = 0; i87 < value86.length; i87++) {
          final item88 = value86[i87];
          if (item88 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'super_admin',
                    'support',
                    'finance',
                    'read_only',
                  }.contains(item88))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'platformRoles'), '$i87'),
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
      final value89 = json['features'];
      if (value89 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'features'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i90 = 0; i90 < value89.length; i90++) {
          final item91 = value89[i90];
          if (item91 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'ai_assistant',
                    'webhooks',
                    'billing',
                    'advanced_reports',
                  }.contains(item91))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'features'), '$i90'),
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
      final value92 = json['flags'];
      if (value92 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'flags'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i93 = 0; i93 < value92.length; i93++) {
          final item94 = value92[i93];
          if (item94 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{'new_reports'}.contains(item94))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'flags'), '$i93'),
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
      final value95 = json['userId'];
      if (value95 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value95)) {
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
      final value96 = json['tenantId'];
      if (value96 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value96)) {
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
      final value97 = json['sessionId'];
      if (value97 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value97)) {
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
      final value98 = json['permissions'];
      if (value98 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i99 = 0; i99 < value98.length; i99++) {
          final item100 = value98[i99];
          if (item100 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'reports:read',
                    'reports:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item100))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i99'),
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
      final value101 = json['roles'];
      if (value101 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'roles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value101.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'roles'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i102 = 0; i102 < value101.length; i102++) {
          final item103 = value101[i102];
          if (item103 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'roles'), '$i102'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item103.isEmpty) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roles'), '$i102'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item103.length > 80) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roles'), '$i102'),
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
      final value104 = json['permissionVersion'];
      if (value104 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'permissionVersion'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value104.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'permissionVersion'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern7.hasMatch(value104)) {
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
      final value105 = json['platformRoles'];
      if (value105 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'platformRoles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i106 = 0; i106 < value105.length; i106++) {
          final item107 = value105[i106];
          if (item107 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'super_admin',
                    'support',
                    'finance',
                    'read_only',
                  }.contains(item107))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'platformRoles'), '$i106'),
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
      final value108 = json['features'];
      if (value108 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'features'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i109 = 0; i109 < value108.length; i109++) {
          final item110 = value108[i109];
          if (item110 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'ai_assistant',
                    'webhooks',
                    'billing',
                    'advanced_reports',
                  }.contains(item110))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'features'), '$i109'),
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
      final value111 = json['flags'];
      if (value111 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'flags'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i112 = 0; i112 < value111.length; i112++) {
          final item113 = value111[i112];
          if (item113 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{'new_reports'}.contains(item113))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'flags'), '$i112'),
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
      final value114 = json['mfaVerifiedAt'];
      if (value114 != null) {
        if (value114 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'mfaVerifiedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern3.hasMatch(value114)) {
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
      final value115 = json['sessionId'];
      if (value115 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value115)) {
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
      final value116 = json['userId'];
      if (value116 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value116)) {
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
      final value117 = json['tenantId'];
      if (value117 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value117)) {
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
      final value118 = json['reason'];
      if (value118 is! String ||
          !const <String>{
            'logout',
            'user_action',
            'password_changed',
            'admin_action',
            'compromised',
          }.contains(value118)) {
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
      final value119 = json['revokedAt'];
      if (value119 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'revokedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value119)) {
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
      final value120 = json['scope'];
      if (value120 is! String ||
          !const <String>{'session', 'user', 'tenant'}.contains(value120)) {
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
      final value121 = json['subjectId'];
      if (value121 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'subjectId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value121)) {
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
      final value122 = json['revokedBefore'];
      if (value122 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'revokedBefore'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value122)) {
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
      final value123 = json['email'];
      if (value123 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value123.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value123)) {
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
      final value124 = json['password'];
      if (value124 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'password'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value124.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'password'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value124.length > 128) {
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
      final value125 = json['displayName'];
      if (value125 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'displayName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value125.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value125.length > 120) {
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
      final value126 = json['locale'];
      if (value126 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'locale'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value126.length < 2) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value126.length > 35) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern8.hasMatch(value126)) {
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
      final value127 = json['invitationToken'];
      if (value127 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invitationToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value127.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'invitationToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value127.length > 512) {
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
      final value128 = json['email'];
      if (value128 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value128.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value128)) {
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
      final value129 = json['token'];
      if (value129 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'token'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value129.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value129.length > 512) {
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
      final value130 = json['id'];
      if (value130 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value130)) {
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
      final value131 = json['email'];
      if (value131 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value131.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value131)) {
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
      final value132 = json['emailVerifiedAt'];
      if (value132 != null) {
        if (value132 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'emailVerifiedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern3.hasMatch(value132)) {
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
      final value133 = json['displayName'];
      if (value133 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'displayName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value133.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value133.length > 120) {
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
      final value134 = json['locale'];
      if (value134 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'locale'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value134.length < 2) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value134.length > 35) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern8.hasMatch(value134)) {
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
      final value135 = json['status'];
      if (value135 is! String ||
          !const <String>{
            'pending_verification',
            'active',
            'suspended',
            'deleted',
          }.contains(value135)) {
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
      final value136 = json['homeTenantId'];
      if (value136 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'homeTenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value136)) {
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
      final value137 = json['lastTenantId'];
      if (value137 != null) {
        if (value137 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'lastTenantId'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern0.hasMatch(value137)) {
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
      final value138 = json['displayName'];
      if (value138 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'displayName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value138.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value138.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('locale')) {
      final value139 = json['locale'];
      if (value139 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'locale'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value139.length < 2) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value139.length > 35) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern8.hasMatch(value139)) {
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
      final value140 = json['newEmail'];
      if (value140 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'newEmail'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value140.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'newEmail'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value140)) {
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
      final value141 = json['token'];
      if (value141 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'token'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value141.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value141.length > 512) {
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
    if (json.containsKey('reason')) {
      final value143 = json['reason'];
      if (value143 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reason'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value143.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value143.length > 200) {
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
      final value144 = json['userId'];
      if (value144 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value144)) {
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
    if (json.containsKey('status')) {
      final value146 = json['status'];
      if (value146 is! String ||
          !const <String>{
            'pending_verification',
            'active',
            'suspended',
            'deleted',
          }.contains(value146)) {
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
      final value147 = json['userId'];
      if (value147 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value147)) {
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
      final value148 = json['currentPassword'];
      if (value148 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'currentPassword'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value148.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'currentPassword'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value148.length > 128) {
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
      final value149 = json['newPassword'];
      if (value149 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'newPassword'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value149.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'newPassword'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value149.length > 128) {
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
      final value150 = json['email'];
      if (value150 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value150.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value150)) {
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
      final value151 = json['token'];
      if (value151 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'token'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value151.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value151.length > 512) {
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
      final value152 = json['newPassword'];
      if (value152 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'newPassword'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value152.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'newPassword'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value152.length > 128) {
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
      final value153 = json['deviceId'];
      if (value153 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value153)) {
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
      final value154 = json['deviceId'];
      if (value154 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value154)) {
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
      final value155 = json['pushToken'];
      if (value155 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'pushToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value155.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'pushToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value155.length > 512) {
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
      final value156 = json['deviceId'];
      if (value156 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value156.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value156.length > 512) {
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
      final value157 = json['timestamp'];
      if (value157 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'timestamp'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value157)) {
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
      final value158 = json['nonce'];
      if (value158 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'nonce'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value158.length < 16) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value158.length > 128) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value158)) {
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
      final value159 = json['signature'];
      if (value159 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'signature'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value159.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value159.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value159)) {
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
      final value160 = json['challengeId'];
      if (value160 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value160)) {
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
      final value161 = json['deviceId'];
      if (value161 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value161.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value161.length > 512) {
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
      final value162 = json['timestamp'];
      if (value162 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'timestamp'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value162)) {
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
      final value163 = json['nonce'];
      if (value163 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'nonce'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value163.length < 16) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value163.length > 128) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value163)) {
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
      final value164 = json['signature'];
      if (value164 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'signature'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value164.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value164.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value164)) {
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
      final value165 = json['browser'];
      if (value165 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'browser'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value165.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'browser'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value165.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'browser'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('os')) {
      final value166 = json['os'];
      if (value166 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'os'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value166.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'os'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value166.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'os'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('ip')) {
      final value167 = json['ip'];
      if (value167 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'ip'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value167.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'ip'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value167.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'ip'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('city')) {
      final value168 = json['city'];
      if (value168 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'city'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value168.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'city'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value168.length > 120) {
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
      final value169 = json['challengeId'];
      if (value169 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value169)) {
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
      final value170 = json['code'];
      if (value170 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value170.length < 6) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value170.length > 64) {
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
      final value171 = json['requestedAt'];
      if (value171 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'requestedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value171)) {
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
      final value172 = json['expiresAt'];
      if (value172 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'expiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value172)) {
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
      final value173 = json['context'];
      ApprovalContextSchema.check(
        value173,
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
      final value174 = json['approvals'];
      if (value174 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'approvals'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value174.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'approvals'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i175 = 0; i175 < value174.length; i175++) {
          final item176 = value174[i175];
          DeviceApprovalSchema.check(
            item176,
            joinPath(joinPath(path, 'approvals'), '$i175'),
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
      final value177 = json['secret'];
      if (value177 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'secret'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value177.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'secret'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value177.length > 128) {
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
      final value178 = json['otpauthUri'];
      if (value178 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'otpauthUri'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value178.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'otpauthUri'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value178.length > 512) {
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
      final value179 = json['code'];
      if (value179 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value179.length < 6) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value179.length > 8) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern9.hasMatch(value179)) {
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
      final value180 = json['codes'];
      if (value180 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'codes'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value180.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'codes'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i181 = 0; i181 < value180.length; i181++) {
          final item182 = value180[i181];
          if (item182 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'codes'), '$i181'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item182.length < 8) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'codes'), '$i181'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item182.length > 64) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'codes'), '$i181'),
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
      final value184 = json['availableAt'];
      if (value184 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'availableAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value184)) {
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
      final value185 = json['mfaToken'];
      if (value185 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value185.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value185.length > 2048) {
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
      final value186 = json['token'];
      if (value186 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'token'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value186.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value186.length > 512) {
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
      final value187 = json['devicePublicKey'];
      if (value187 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'devicePublicKey'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value187.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value187.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value187)) {
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
    if (json.containsKey('optionsJson')) {
      final value189 = json['optionsJson'];
      if (value189 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'optionsJson'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value189.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'optionsJson'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value189.length > 8192) {
          addFieldError(
            errors,
            joinPath(path, 'optionsJson'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value189)) {
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
      final value190 = json['challengeId'];
      if (value190 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value190)) {
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
      final value191 = json['credentialJson'];
      if (value191 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'credentialJson'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value191.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value191.length > 16384) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value191)) {
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
      final value192 = json['deviceId'];
      if (value192 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value192.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value192.length > 512) {
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
      final value193 = json['mfaToken'];
      if (value193 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value193.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value193.length > 2048) {
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
      final value194 = json['mfaToken'];
      if (value194 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value194.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value194.length > 2048) {
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
      final value195 = json['challengeId'];
      if (value195 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value195)) {
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
      final value196 = json['credentialJson'];
      if (value196 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'credentialJson'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value196.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value196.length > 16384) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value196)) {
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
      final value197 = json['devicePublicKey'];
      if (value197 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'devicePublicKey'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value197.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value197.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value197)) {
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
      final value198 = json['mfaToken'];
      if (value198 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value198.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value198.length > 2048) {
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
      final value199 = json['mfaToken'];
      if (value199 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value199.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value199.length > 2048) {
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
      final value200 = json['challengeId'];
      if (value200 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value200)) {
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
      final value201 = json['credentialJson'];
      if (value201 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'credentialJson'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value201.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value201.length > 16384) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value201)) {
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
      final value202 = json['id'];
      if (value202 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value202)) {
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
      final value203 = json['name'];
      if (value203 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value203.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value203.length > 120) {
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
      final value204 = json['createdAt'];
      if (value204 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value204)) {
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
      final value205 = json['lastUsedAt'];
      if (value205 != null) {
        if (value205 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'lastUsedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern3.hasMatch(value205)) {
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
      final value206 = json['backedUp'];
      if (value206 is! bool) {
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
      final value207 = json['items'];
      if (value207 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value207.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i208 = 0; i208 < value207.length; i208++) {
          final item209 = value207[i208];
          PasskeySummarySchema.check(
            item209,
            joinPath(joinPath(path, 'items'), '$i208'),
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
      final value210 = json['nextCursor'];
      if (value210 != null) {
        if (value210 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value210.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value210.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern6.hasMatch(value210)) {
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
      final value211 = json['challengeId'];
      if (value211 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value211)) {
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
      final value212 = json['credentialJson'];
      if (value212 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'credentialJson'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value212.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value212.length > 16384) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value212)) {
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
      final value213 = json['name'];
      if (value213 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value213.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value213.length > 120) {
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
      final value214 = json['passkeyId'];
      if (value214 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'passkeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value214)) {
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
      final value215 = json['id'];
      if (value215 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value215)) {
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
      final value216 = json['slug'];
      if (value216 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'slug'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value216.length < 3) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value216.length > 63) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern10.hasMatch(value216)) {
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
      final value217 = json['name'];
      if (value217 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value217.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value217.length > 120) {
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
      final value218 = json['region'];
      if (value218 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value218.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value218.length > 32) {
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
      final value219 = json['kind'];
      if (value219 is! String ||
          !const <String>{
            'organization',
            'shared_customers',
            'platform',
          }.contains(value219)) {
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
      final value220 = json['status'];
      if (value220 is! String ||
          !const <String>{
            'provisioning',
            'active',
            'suspended',
            'deleting',
          }.contains(value220)) {
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
      final value221 = json['slug'];
      if (value221 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'slug'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value221.length < 3) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value221.length > 63) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern10.hasMatch(value221)) {
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
    } else {
      addFieldError(
        errors,
        joinPath(path, 'name'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('region')) {
      final value223 = json['region'];
      if (value223 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value223.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value223.length > 32) {
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
      final value224 = json['name'];
      if (value224 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value224.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value224.length > 120) {
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
      final value225 = json['id'];
      if (value225 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value225)) {
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
      final value226 = json['slug'];
      if (value226 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'slug'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value226.length < 3) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value226.length > 63) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern10.hasMatch(value226)) {
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
      final value227 = json['name'];
      if (value227 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value227.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value227.length > 120) {
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
      final value228 = json['kind'];
      if (value228 is! String ||
          !const <String>{
            'organization',
            'shared_customers',
            'platform',
          }.contains(value228)) {
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
      final value229 = json['status'];
      if (value229 is! String ||
          !const <String>{
            'provisioning',
            'active',
            'suspended',
            'deleting',
          }.contains(value229)) {
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
      final value230 = json['joinedAt'];
      if (value230 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'joinedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value230)) {
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
      final value231 = json['items'];
      if (value231 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value231.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i232 = 0; i232 < value231.length; i232++) {
          final item233 = value231[i232];
          MyTenantSummarySchema.check(
            item233,
            joinPath(joinPath(path, 'items'), '$i232'),
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
      final value234 = json['nextCursor'];
      if (value234 != null) {
        if (value234 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value234.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value234.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern6.hasMatch(value234)) {
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
      final value235 = json['tenantId'];
      if (value235 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value235)) {
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
    if (json.containsKey('status')) {
      final value237 = json['status'];
      if (value237 is! String ||
          !const <String>{
            'provisioning',
            'active',
            'suspended',
            'deleting',
          }.contains(value237)) {
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
      final value238 = json['tenantId'];
      if (value238 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value238)) {
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
      final value239 = json['slug'];
      if (value239 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'slug'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value239.length < 3) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value239.length > 63) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern10.hasMatch(value239)) {
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
      final value240 = json['name'];
      if (value240 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value240.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value240.length > 120) {
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
      final value241 = json['region'];
      if (value241 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value241.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value241.length > 32) {
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
      final value242 = json['kind'];
      if (value242 is! String ||
          !const <String>{
            'organization',
            'shared_customers',
            'platform',
          }.contains(value242)) {
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
      final value243 = json['ownerUserId'];
      if (value243 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'ownerUserId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value243)) {
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
      final value244 = json['tenantId'];
      if (value244 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value244)) {
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
      final value245 = json['tenantId'];
      if (value245 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value245)) {
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
      final value246 = json['reason'];
      if (value246 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reason'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value246.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value246.length > 200) {
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
      final value247 = json['userId'];
      if (value247 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value247)) {
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
      final value248 = json['email'];
      if (value248 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value248.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value248)) {
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
      final value249 = json['displayName'];
      if (value249 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'displayName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value249.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value249.length > 120) {
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
      final value250 = json['groupIds'];
      if (value250 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groupIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value250.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'groupIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i251 = 0; i251 < value250.length; i251++) {
          final item252 = value250[i251];
          if (item252 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groupIds'), '$i251'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item252)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groupIds'), '$i251'),
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
      final value253 = json['joinedAt'];
      if (value253 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'joinedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value253)) {
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
      final value254 = json['items'];
      if (value254 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value254.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i255 = 0; i255 < value254.length; i255++) {
          final item256 = value254[i255];
          MemberSummarySchema.check(
            item256,
            joinPath(joinPath(path, 'items'), '$i255'),
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
      final value257 = json['nextCursor'];
      if (value257 != null) {
        if (value257 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value257.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value257.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern6.hasMatch(value257)) {
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
      final value258 = json['userId'];
      if (value258 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value258)) {
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
      final value259 = json['userId'];
      if (value259 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value259)) {
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
      final value260 = json['groupIds'];
      if (value260 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groupIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value260.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'groupIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i261 = 0; i261 < value260.length; i261++) {
          final item262 = value260[i261];
          if (item262 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groupIds'), '$i261'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item262)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groupIds'), '$i261'),
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
      final value263 = json['id'];
      if (value263 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value263)) {
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
      final value264 = json['name'];
      if (value264 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value264.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value264.length > 80) {
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
      final value265 = json['system'];
      if (value265 is! bool) {
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
      final value266 = json['roleIds'];
      if (value266 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'roleIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value266.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'roleIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i267 = 0; i267 < value266.length; i267++) {
          final item268 = value266[i267];
          if (item268 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'roleIds'), '$i267'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item268)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roleIds'), '$i267'),
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
      final value269 = json['memberCount'];
      if (value269 is! num ||
          !value269.isFinite ||
          value269 != value269.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'memberCount'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value269 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'memberCount'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value269 > 9007199254740991) {
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
      final value270 = json['items'];
      if (value270 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value270.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i271 = 0; i271 < value270.length; i271++) {
          final item272 = value270[i271];
          GroupSummarySchema.check(
            item272,
            joinPath(joinPath(path, 'items'), '$i271'),
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
      final value273 = json['nextCursor'];
      if (value273 != null) {
        if (value273 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value273.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value273.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern6.hasMatch(value273)) {
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
    if (json.containsKey('name')) {
      final value276 = json['name'];
      if (value276 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value276.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value276.length > 80) {
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
      final value277 = json['groupId'];
      if (value277 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'groupId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value277)) {
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
      final value278 = json['groupId'];
      if (value278 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'groupId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value278)) {
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
      final value279 = json['roleIds'];
      if (value279 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'roleIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value279.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'roleIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i280 = 0; i280 < value279.length; i280++) {
          final item281 = value279[i280];
          if (item281 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'roleIds'), '$i280'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item281)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roleIds'), '$i280'),
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
      final value282 = json['id'];
      if (value282 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value282)) {
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
      final value283 = json['name'];
      if (value283 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value283.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value283.length > 80) {
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
      final value284 = json['systemRole'];
      if (value284 != null) {
        if (value284 is! String ||
            !const <String>{
              'owner',
              'admin',
              'member',
              'billing',
            }.contains(value284)) {
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
      final value285 = json['permissions'];
      if (value285 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value285.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i286 = 0; i286 < value285.length; i286++) {
          final item287 = value285[i286];
          if (item287 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'reports:read',
                    'reports:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item287))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i286'),
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
      final value288 = json['items'];
      if (value288 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value288.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i289 = 0; i289 < value288.length; i289++) {
          final item290 = value288[i289];
          RoleSummarySchema.check(
            item290,
            joinPath(joinPath(path, 'items'), '$i289'),
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
      final value291 = json['nextCursor'];
      if (value291 != null) {
        if (value291 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value291.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value291.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern6.hasMatch(value291)) {
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
      final value292 = json['name'];
      if (value292 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value292.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value292.length > 80) {
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
      final value293 = json['permissions'];
      if (value293 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value293.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i294 = 0; i294 < value293.length; i294++) {
          final item295 = value293[i294];
          if (item295 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'reports:read',
                    'reports:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item295))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i294'),
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
      final value296 = json['roleId'];
      if (value296 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'roleId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value296)) {
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
      final value297 = json['name'];
      if (value297 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value297.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value297.length > 80) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('permissions')) {
      final value298 = json['permissions'];
      if (value298 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value298.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i299 = 0; i299 < value298.length; i299++) {
          final item300 = value298[i299];
          if (item300 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'reports:read',
                    'reports:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item300))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i299'),
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
      final value301 = json['roleId'];
      if (value301 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'roleId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value301)) {
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
      final value302 = json['id'];
      if (value302 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value302)) {
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
      final value303 = json['email'];
      if (value303 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value303.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value303)) {
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
      final value304 = json['groupIds'];
      if (value304 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groupIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value304.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'groupIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i305 = 0; i305 < value304.length; i305++) {
          final item306 = value304[i305];
          if (item306 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groupIds'), '$i305'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item306)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groupIds'), '$i305'),
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
      final value307 = json['status'];
      if (value307 is! String ||
          !const <String>{
            'pending',
            'accepted',
            'revoked',
            'expired',
          }.contains(value307)) {
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
      final value308 = json['expiresAt'];
      if (value308 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'expiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value308)) {
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
      final value309 = json['invitedBy'];
      if (value309 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invitedBy'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value309)) {
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
      final value310 = json['items'];
      if (value310 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value310.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i311 = 0; i311 < value310.length; i311++) {
          final item312 = value310[i311];
          InvitationSummarySchema.check(
            item312,
            joinPath(joinPath(path, 'items'), '$i311'),
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
      final value313 = json['nextCursor'];
      if (value313 != null) {
        if (value313 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value313.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value313.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern6.hasMatch(value313)) {
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
      final value314 = json['email'];
      if (value314 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value314.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern2.hasMatch(value314)) {
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
      final value315 = json['groupIds'];
      if (value315 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groupIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value315.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'groupIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i316 = 0; i316 < value315.length; i316++) {
          final item317 = value315[i316];
          if (item317 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groupIds'), '$i316'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item317)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groupIds'), '$i316'),
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
      final value318 = json['invitationId'];
      if (value318 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invitationId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value318)) {
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
      final value319 = json['token'];
      if (value319 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'token'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value319.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value319.length > 512) {
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
      final value320 = json['id'];
      if (value320 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value320)) {
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
      final value321 = json['name'];
      if (value321 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value321.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value321.length > 120) {
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
      final value322 = json['permissions'];
      if (value322 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value322.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i323 = 0; i323 < value322.length; i323++) {
          final item324 = value322[i323];
          if (item324 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'reports:read',
                    'reports:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item324))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i323'),
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
      final value325 = json['status'];
      if (value325 is! String ||
          !const <String>{'active', 'disabled'}.contains(value325)) {
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
      final value326 = json['pinnedApiVersion'];
      if (value326 != null) {
        if (value326 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'pinnedApiVersion'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value326.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'pinnedApiVersion'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value326.length > 16) {
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
      final value327 = json['createdAt'];
      if (value327 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value327)) {
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
      final value328 = json['items'];
      if (value328 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value328.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i329 = 0; i329 < value328.length; i329++) {
          final item330 = value328[i329];
          ServiceAccountSummarySchema.check(
            item330,
            joinPath(joinPath(path, 'items'), '$i329'),
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
      final value331 = json['nextCursor'];
      if (value331 != null) {
        if (value331 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value331.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value331.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern6.hasMatch(value331)) {
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
      final value332 = json['name'];
      if (value332 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value332.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value332.length > 120) {
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
      final value333 = json['permissions'];
      if (value333 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value333.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i334 = 0; i334 < value333.length; i334++) {
          final item335 = value333[i334];
          if (item335 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'reports:read',
                    'reports:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item335))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i334'),
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
      final value336 = json['pinnedApiVersion'];
      if (value336 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'pinnedApiVersion'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value336.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'pinnedApiVersion'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value336.length > 16) {
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
      final value337 = json['serviceAccountId'];
      if (value337 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value337)) {
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
      final value338 = json['name'];
      if (value338 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value338.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value338.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('permissions')) {
      final value339 = json['permissions'];
      if (value339 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value339.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i340 = 0; i340 < value339.length; i340++) {
          final item341 = value339[i340];
          if (item341 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'reports:read',
                    'reports:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item341))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i340'),
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
      final value343 = json['id'];
      if (value343 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value343)) {
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
      final value344 = json['serviceAccountId'];
      if (value344 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value344)) {
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
      final value345 = json['prefix'];
      if (value345 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'prefix'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value345.length < 12) {
          addFieldError(
            errors,
            joinPath(path, 'prefix'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value345.length > 12) {
          addFieldError(
            errors,
            joinPath(path, 'prefix'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern11.hasMatch(value345)) {
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
      final value346 = json['environment'];
      if (value346 is! String ||
          !const <String>{'live', 'test'}.contains(value346)) {
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
      final value347 = json['status'];
      if (value347 is! String ||
          !const <String>{'active', 'rotated', 'revoked'}.contains(value347)) {
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
      final value348 = json['expiresAt'];
      if (value348 != null) {
        if (value348 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'expiresAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern3.hasMatch(value348)) {
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
      final value349 = json['validUntil'];
      if (value349 != null) {
        if (value349 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'validUntil'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern3.hasMatch(value349)) {
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
      final value350 = json['allowedCidrs'];
      if (value350 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'allowedCidrs'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value350.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'allowedCidrs'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i351 = 0; i351 < value350.length; i351++) {
          final item352 = value350[i351];
          if (item352 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'allowedCidrs'), '$i351'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item352.isEmpty) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'allowedCidrs'), '$i351'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item352.length > 64) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'allowedCidrs'), '$i351'),
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
      final value353 = json['lastUsedAt'];
      if (value353 != null) {
        if (value353 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'lastUsedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern3.hasMatch(value353)) {
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
      final value354 = json['createdAt'];
      if (value354 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value354)) {
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
      final value355 = json['items'];
      if (value355 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value355.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i356 = 0; i356 < value355.length; i356++) {
          final item357 = value355[i356];
          ApiKeySummarySchema.check(
            item357,
            joinPath(joinPath(path, 'items'), '$i356'),
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
      final value358 = json['nextCursor'];
      if (value358 != null) {
        if (value358 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value358.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value358.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern6.hasMatch(value358)) {
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
      final value359 = json['serviceAccountId'];
      if (value359 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value359)) {
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
      final value360 = json['limit'];
      if (value360 is! num ||
          !value360.isFinite ||
          value360 != value360.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'limit'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value360 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value360 > 100) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    }
    if (json.containsKey('after')) {
      final value361 = json['after'];
      if (value361 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'after'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value361.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value361.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value361)) {
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
      final value362 = json['serviceAccountId'];
      if (value362 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value362)) {
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
      final value363 = json['environment'];
      if (value363 is! String ||
          !const <String>{'live', 'test'}.contains(value363)) {
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
      final value364 = json['expiresAt'];
      if (value364 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'expiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value364)) {
          addFieldError(
            errors,
            joinPath(path, 'expiresAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    if (json.containsKey('allowedCidrs')) {
      final value365 = json['allowedCidrs'];
      if (value365 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'allowedCidrs'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value365.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'allowedCidrs'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i366 = 0; i366 < value365.length; i366++) {
          final item367 = value365[i366];
          if (item367 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'allowedCidrs'), '$i366'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item367.isEmpty) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'allowedCidrs'), '$i366'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item367.length > 64) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'allowedCidrs'), '$i366'),
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
      final value368 = json['apiKey'];
      ApiKeySummarySchema.check(
        value368,
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
      final value369 = json['secret'];
      if (value369 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'secret'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value369.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'secret'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value369.length > 128) {
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
      final value370 = json['apiKeyId'];
      if (value370 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value370)) {
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
      final value371 = json['apiKeyId'];
      if (value371 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value371)) {
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
      final value372 = json['apiKey'];
      if (value372 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKey'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value372.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'apiKey'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value372.length > 256) {
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
      final value373 = json['clientIp'];
      if (value373 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'clientIp'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value373.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'clientIp'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value373.length > 64) {
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
      final value374 = json['apiKeyId'];
      if (value374 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value374)) {
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
      final value375 = json['serviceAccountId'];
      if (value375 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value375)) {
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
      final value376 = json['tenantId'];
      if (value376 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value376)) {
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
      final value377 = json['permissions'];
      if (value377 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value377.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i378 = 0; i378 < value377.length; i378++) {
          final item379 = value377[i378];
          if (item379 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'tasks:read',
                    'tasks:write',
                    'billing:read',
                    'billing:write',
                    'reports:read',
                    'reports:write',
                    'backoffice:access',
                    'identity:members:read',
                    'identity:members:manage',
                    'identity:groups:manage',
                    'identity:roles:manage',
                    'identity:invitations:manage',
                    'identity:service-accounts:manage',
                    'identity:api-keys:manage',
                    'identity:tenant:manage',
                  }.contains(item379))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i378'),
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
      final value380 = json['environment'];
      if (value380 is! String ||
          !const <String>{'live', 'test'}.contains(value380)) {
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
      final value381 = json['expiresAt'];
      if (value381 != null) {
        if (value381 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'expiresAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern3.hasMatch(value381)) {
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
      final value382 = json['pinnedApiVersion'];
      if (value382 != null) {
        if (value382 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'pinnedApiVersion'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value382.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'pinnedApiVersion'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value382.length > 16) {
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
      final value383 = json['kty'];
      if (value383 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'kty'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value383.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'kty'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value383.length > 256) {
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
      final value384 = json['crv'];
      if (value384 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'crv'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value384.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'crv'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value384.length > 256) {
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
      final value385 = json['kid'];
      if (value385 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'kid'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value385.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'kid'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value385.length > 256) {
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
      final value386 = json['use'];
      if (value386 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'use'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value386.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'use'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value386.length > 256) {
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
      final value387 = json['alg'];
      if (value387 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'alg'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value387.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'alg'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value387.length > 256) {
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
      final value388 = json['x'];
      if (value388 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'x'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value388.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'x'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value388.length > 256) {
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
      final value389 = json['y'];
      if (value389 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'y'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value389.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'y'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value389.length > 256) {
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
      final value390 = json['keys'];
      if (value390 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'keys'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value390.length > 10) {
          addFieldError(
            errors,
            joinPath(path, 'keys'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i391 = 0; i391 < value390.length; i391++) {
          final item392 = value390[i391];
          JwkSchema.check(
            item392,
            joinPath(joinPath(path, 'keys'), '$i391'),
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
      final value393 = json['userId'];
      if (value393 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value393)) {
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
      final value394 = json['homeTenantId'];
      if (value394 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'homeTenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value394)) {
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
      final value395 = json['registeredAt'];
      if (value395 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'registeredAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value395)) {
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
      final value396 = json['userId'];
      if (value396 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value396)) {
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
      final value397 = json['reason'];
      if (value397 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reason'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value397.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value397.length > 200) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('suspendedAt')) {
      final value398 = json['suspendedAt'];
      if (value398 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'suspendedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value398)) {
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
    if (json.containsKey('reactivatedAt')) {
      final value400 = json['reactivatedAt'];
      if (value400 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reactivatedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value400)) {
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
    if (json.containsKey('changedAt')) {
      final value402 = json['changedAt'];
      if (value402 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'changedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value402)) {
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
      final value403 = json['userId'];
      if (value403 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value403)) {
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
      final value404 = json['deviceId'];
      if (value404 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value404)) {
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
      final value405 = json['platform'];
      if (value405 is! String ||
          !const <String>{
            'ios',
            'android',
            'web',
            'macos',
            'windows',
            'linux',
          }.contains(value405)) {
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
      final value406 = json['verifier'];
      if (value406 is! bool) {
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
      final value407 = json['registeredAt'];
      if (value407 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'registeredAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value407)) {
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
      final value408 = json['userId'];
      if (value408 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value408)) {
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
      final value409 = json['deviceId'];
      if (value409 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value409)) {
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
      final value410 = json['removedAt'];
      if (value410 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'removedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value410)) {
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
      final value411 = json['tenantId'];
      if (value411 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value411)) {
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
      final value412 = json['slug'];
      if (value412 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'slug'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value412.length < 3) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value412.length > 63) {
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
      final value413 = json['kind'];
      if (value413 is! String ||
          !const <String>{
            'organization',
            'shared_customers',
            'platform',
          }.contains(value413)) {
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
      final value414 = json['region'];
      if (value414 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value414.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value414.length > 32) {
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
      final value415 = json['ownerUserId'];
      if (value415 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'ownerUserId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value415)) {
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
      final value416 = json['createdAt'];
      if (value416 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value416)) {
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
    if (json.containsKey('suspendedAt')) {
      final value418 = json['suspendedAt'];
      if (value418 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'suspendedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value418)) {
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
    if (json.containsKey('reactivatedAt')) {
      final value420 = json['reactivatedAt'];
      if (value420 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reactivatedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value420)) {
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
      final value421 = json['tenantId'];
      if (value421 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value421)) {
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
      final value422 = json['userId'];
      if (value422 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value422)) {
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
      final value423 = json['kind'];
      if (value423 is! String ||
          !const <String>{
            'added',
            'removed',
            'groups_changed',
          }.contains(value423)) {
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
      final value424 = json['groupIds'];
      if (value424 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groupIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value424.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'groupIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i425 = 0; i425 < value424.length; i425++) {
          final item426 = value424[i425];
          if (item426 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groupIds'), '$i425'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item426)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groupIds'), '$i425'),
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
      final value427 = json['changedAt'];
      if (value427 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'changedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value427)) {
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
      final value428 = json['tenantId'];
      if (value428 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value428)) {
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
      final value429 = json['userId'];
      if (value429 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value429)) {
          addFieldError(
            errors,
            joinPath(path, 'userId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    if (json.containsKey('permissionVersion')) {
      final value430 = json['permissionVersion'];
      if (value430 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'permissionVersion'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value430.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'permissionVersion'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern7.hasMatch(value430)) {
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
      final value431 = json['changedAt'];
      if (value431 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'changedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value431)) {
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
      final value432 = json['apiKeyId'];
      if (value432 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value432)) {
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
      final value433 = json['serviceAccountId'];
      if (value433 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value433)) {
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
      final value434 = json['tenantId'];
      if (value434 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value434)) {
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
      final value435 = json['prefix'];
      if (value435 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'prefix'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value435.length < 12) {
          addFieldError(
            errors,
            joinPath(path, 'prefix'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value435.length > 12) {
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
      final value436 = json['environment'];
      if (value436 is! String ||
          !const <String>{'live', 'test'}.contains(value436)) {
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
      final value437 = json['createdBy'];
      if (value437 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdBy'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value437)) {
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
      final value438 = json['createdAt'];
      if (value438 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value438)) {
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
      final value439 = json['apiKeyId'];
      if (value439 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value439)) {
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
      final value440 = json['tenantId'];
      if (value440 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value440)) {
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
      final value441 = json['prefix'];
      if (value441 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'prefix'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value441.length < 12) {
          addFieldError(
            errors,
            joinPath(path, 'prefix'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value441.length > 12) {
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
      final value442 = json['revokedAt'];
      if (value442 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'revokedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value442)) {
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
      final value443 = json['alertId'];
      if (value443 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'alertId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value443)) {
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
      final value444 = json['userId'];
      if (value444 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value444)) {
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
      final value445 = json['type'];
      if (value445 is! String ||
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
          }.contains(value445)) {
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
      final value446 = json['raisedAt'];
      if (value446 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'raisedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value446)) {
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

/// Validador de [TenantCreation] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class TenantCreationSchema {
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
      final value447 = json['tenantId'];
      if (value447 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value447)) {
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
    if (json.containsKey('sagaId')) {
      final value448 = json['sagaId'];
      if (value448 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sagaId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value448)) {
          addFieldError(
            errors,
            joinPath(path, 'sagaId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'sagaId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [TenantCreation] contra su contrato.
extension TenantCreationValidation on TenantCreation {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => TenantCreationSchema.validate(toJson());
}

/// Validador de [AccountDeletionStarted] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class AccountDeletionStartedSchema {
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
    if (json.containsKey('sagaId')) {
      final value449 = json['sagaId'];
      if (value449 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sagaId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value449)) {
          addFieldError(
            errors,
            joinPath(path, 'sagaId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'sagaId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [AccountDeletionStarted] contra su contrato.
extension AccountDeletionStartedValidation on AccountDeletionStarted {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      AccountDeletionStartedSchema.validate(toJson());
}

/// Validador de [GetSagaRequest] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class GetSagaRequestSchema {
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
    if (json.containsKey('sagaId')) {
      final value450 = json['sagaId'];
      if (value450 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sagaId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value450)) {
          addFieldError(
            errors,
            joinPath(path, 'sagaId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'sagaId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'sagaId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validación de [GetSagaRequest] contra su contrato.
extension GetSagaRequestValidation on GetSagaRequest {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => GetSagaRequestSchema.validate(toJson());
}

/// Validador de [SagaSummary] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class SagaSummarySchema {
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
    if (json.containsKey('sagaId')) {
      final value451 = json['sagaId'];
      if (value451 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sagaId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value451)) {
          addFieldError(
            errors,
            joinPath(path, 'sagaId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'sagaId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('saga')) {
      final value452 = json['saga'];
      if (value452 is! String ||
          !const <String>{
            'identity.tenant-onboarding',
            'identity.delete-account',
            'identity.move-tenant',
          }.contains(value452)) {
        addFieldError(
          errors,
          joinPath(path, 'saga'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'saga'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value453 = json['status'];
      if (value453 is! String ||
          !const <String>{
            'running',
            'suspended',
            'compensating',
            'completed',
            'compensated',
            'compensation_failed',
            'requires_intervention',
          }.contains(value453)) {
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
    if (json.containsKey('startedAt')) {
      final value454 = json['startedAt'];
      if (value454 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'startedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value454)) {
          addFieldError(
            errors,
            joinPath(path, 'startedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'startedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('finishedAt')) {
      final value455 = json['finishedAt'];
      if (value455 != null) {
        if (value455 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'finishedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern3.hasMatch(value455)) {
            addFieldError(
              errors,
              joinPath(path, 'finishedAt'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'finishedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [SagaSummary] contra su contrato.
extension SagaSummaryValidation on SagaSummary {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => SagaSummarySchema.validate(toJson());
}

/// Validador de [EraseUserInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class EraseUserInputSchema {
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
      final value456 = json['userId'];
      if (value456 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value456)) {
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

/// Validación de [EraseUserInput] contra su contrato.
extension EraseUserInputValidation on EraseUserInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => EraseUserInputSchema.validate(toJson());
}

/// Validador de [EraseUserResult] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class EraseUserResultSchema {
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
      final value457 = json['userId'];
      if (value457 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value457)) {
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
    if (json.containsKey('erasedAt')) {
      final value458 = json['erasedAt'];
      if (value458 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'erasedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value458)) {
          addFieldError(
            errors,
            joinPath(path, 'erasedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'erasedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [EraseUserResult] contra su contrato.
extension EraseUserResultValidation on EraseUserResult {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => EraseUserResultSchema.validate(toJson());
}

/// Validador de [ListPushTargetsInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ListPushTargetsInputSchema {
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
      final value459 = json['user'];
      UserRefSchema.check(
        value459,
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

/// Validación de [ListPushTargetsInput] contra su contrato.
extension ListPushTargetsInputValidation on ListPushTargetsInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => ListPushTargetsInputSchema.validate(toJson());
}

/// Validador de [PushTarget] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PushTargetSchema {
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
      final value460 = json['deviceId'];
      if (value460 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value460)) {
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
      final value461 = json['platform'];
      if (value461 is! String ||
          !const <String>{
            'ios',
            'android',
            'web',
            'macos',
            'windows',
            'linux',
          }.contains(value461)) {
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
    if (json.containsKey('pushToken')) {
      final value462 = json['pushToken'];
      if (value462 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'pushToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value462.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'pushToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value462.length > 512) {
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
  }
}

/// Validación de [PushTarget] contra su contrato.
extension PushTargetValidation on PushTarget {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => PushTargetSchema.validate(toJson());
}

/// Validador de [PushTargets] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class PushTargetsSchema {
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
    if (json.containsKey('targets')) {
      final value463 = json['targets'];
      if (value463 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'targets'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value463.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'targets'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i464 = 0; i464 < value463.length; i464++) {
          final item465 = value463[i464];
          PushTargetSchema.check(
            item465,
            joinPath(joinPath(path, 'targets'), '$i464'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'targets'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [PushTargets] contra su contrato.
extension PushTargetsValidation on PushTargets {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => PushTargetsSchema.validate(toJson());
}

/// Validador de [ListMembersByPermissionInput] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class ListMembersByPermissionInputSchema {
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
      final value466 = json['tenantId'];
      if (value466 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value466)) {
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
    if (json.containsKey('permission')) {
      final value467 = json['permission'];
      if (value467 is! String ||
          !const <String>{
            'tasks:read',
            'tasks:write',
            'billing:read',
            'billing:write',
            'reports:read',
            'reports:write',
            'backoffice:access',
            'identity:members:read',
            'identity:members:manage',
            'identity:groups:manage',
            'identity:roles:manage',
            'identity:invitations:manage',
            'identity:service-accounts:manage',
            'identity:api-keys:manage',
            'identity:tenant:manage',
          }.contains(value467)) {
        addFieldError(
          errors,
          joinPath(path, 'permission'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'permission'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('limit')) {
      final value468 = json['limit'];
      if (value468 is! num ||
          !value468.isFinite ||
          value468 != value468.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'limit'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value468 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value468 > 100) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    }
    if (json.containsKey('after')) {
      final value469 = json['after'];
      if (value469 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'after'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value469.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value469.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value469)) {
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
        'permission',
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

/// Validación de [ListMembersByPermissionInput] contra su contrato.
extension ListMembersByPermissionInputValidation
    on ListMembersByPermissionInput {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() =>
      ListMembersByPermissionInputSchema.validate(toJson());
}

/// Validador de [UserRefPage] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UserRefPageSchema {
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
      final value470 = json['items'];
      if (value470 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value470.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i471 = 0; i471 < value470.length; i471++) {
          final item472 = value470[i471];
          UserRefSchema.check(
            item472,
            joinPath(joinPath(path, 'items'), '$i471'),
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
      final value473 = json['nextCursor'];
      if (value473 != null) {
        if (value473 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value473.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value473.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern6.hasMatch(value473)) {
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

/// Validación de [UserRefPage] contra su contrato.
extension UserRefPageValidation on UserRefPage {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => UserRefPageSchema.validate(toJson());
}

/// Validador de [UserErasedPayload] generado desde el JSON Schema del contrato.
///
/// Devuelve los mismos códigos y rutas de campo que el servidor.
abstract final class UserErasedPayloadSchema {
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
      final value474 = json['userId'];
      if (value474 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value474)) {
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
      final value475 = json['homeTenantId'];
      if (value475 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'homeTenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value475)) {
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
    if (json.containsKey('erasedAt')) {
      final value476 = json['erasedAt'];
      if (value476 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'erasedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern3.hasMatch(value476)) {
          addFieldError(
            errors,
            joinPath(path, 'erasedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'erasedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validación de [UserErasedPayload] contra su contrato.
extension UserErasedPayloadValidation on UserErasedPayload {
  /// Errores de este objeto, o una lista vacía si cumple el contrato.
  List<FieldError> validate() => UserErasedPayloadSchema.validate(toJson());
}
