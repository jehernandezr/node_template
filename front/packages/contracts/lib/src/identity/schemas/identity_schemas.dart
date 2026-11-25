// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../identity/types/identity_types.dart';
import '../../platform/enums/platform_enums.dart';
import '../../platform/schemas/platform_schemas.dart';

final _pattern0 = RegExp(
  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})\$',
);
final _pattern1 = RegExp('^\\d{1,15}\\.\\d{1,15}\$');
final _pattern2 = RegExp(
  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))\$',
);
final _pattern3 = RegExp('^[A-Za-z0-9_-]+\$');
final _pattern4 = RegExp(
  '^(?:[A-Za-z0-9_\'+\\-]+\\.)*[A-Za-z0-9_\'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}\$',
);
final _pattern5 = RegExp('^https?:\\/\\/');
final _pattern6 = RegExp('^[A-Za-z0-9-]+\$');
final _pattern7 = RegExp('^\\d+\\.\\d+\$');
final _pattern8 = RegExp('^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*\$');
final _pattern9 = RegExp('^[0-9]+\$');
final _pattern10 = RegExp('^[a-z0-9]+(-[a-z0-9]+)*\$');
final _pattern11 = RegExp('^[A-Z2-7]+\$');

/// Validator for [AccessTokenClaims] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class AccessTokenClaimsSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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

/// Validation of [AccessTokenClaims] against its contract.
extension AccessTokenClaimsValidation on AccessTokenClaims {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => AccessTokenClaimsSchema.validate(toJson());
}

/// Validator for [DeviceSignatureFields] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class DeviceSignatureFieldsSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value23 = json['deviceId'];
      if (value23 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value23.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value23.length > 512) {
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
      final value24 = json['timestamp'];
      if (value24 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'timestamp'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value24)) {
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
      final value25 = json['nonce'];
      if (value25 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'nonce'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value25.length < 16) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value25.length > 128) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value25)) {
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
      final value26 = json['signature'];
      if (value26 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'signature'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value26.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value26.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value26)) {
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

/// Validation of [DeviceSignatureFields] against its contract.
extension DeviceSignatureFieldsValidation on DeviceSignatureFields {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => DeviceSignatureFieldsSchema.validate(toJson());
}

/// Validator for [SignInRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SignInRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value27 = json['email'];
      if (value27 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value27.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern4.hasMatch(value27)) {
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
      final value28 = json['password'];
      if (value28 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'password'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value28.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'password'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value28.length > 128) {
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
    if (json.containsKey('device')) {
      final value29 = json['device'];
      DeviceSignatureFieldsSchema.check(
        value29,
        joinPath(path, 'device'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'email', 'password', 'device'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validation of [SignInRequest] against its contract.
extension SignInRequestValidation on SignInRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => SignInRequestSchema.validate(toJson());
}

/// Validator for [SessionTokens] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SessionTokensSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value30 = json['accessToken'];
      if (value30 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'accessToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value30.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'accessToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value30.length > 8192) {
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
      final value31 = json['accessExpiresAt'];
      if (value31 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'accessExpiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value31)) {
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
      final value32 = json['sessionToken'];
      if (value32 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value32.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'sessionToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value32.length > 8192) {
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

/// Validation of [SessionTokens] against its contract.
extension SessionTokensValidation on SessionTokens {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => SessionTokensSchema.validate(toJson());
}

/// Validator for [PendingMfa] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PendingMfaSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value33 = json['mfaToken'];
      if (value33 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value33.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value33.length > 2048) {
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
      final value34 = json['methods'];
      if (value34 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'methods'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value34.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'methods'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        for (var i35 = 0; i35 < value34.length; i35++) {
          final item36 = value34[i35];
          if (item36 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'device_otp',
                    'email_otp',
                    'totp',
                    'recovery_code',
                    'passkey',
                  }.contains(item36))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'methods'), '$i35'),
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

/// Validation of [PendingMfa] against its contract.
extension PendingMfaValidation on PendingMfa {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => PendingMfaSchema.validate(toJson());
}

/// Validator for [SignInResponse] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SignInResponseSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value37 = json['status'];
      if (value37 is! String ||
          !const <String>{'authenticated', 'mfa_required'}.contains(value37)) {
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
      final value38 = json['tokens'];
      SessionTokensSchema.check(
        value38,
        joinPath(path, 'tokens'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    }
    if (json.containsKey('mfa')) {
      final value39 = json['mfa'];
      PendingMfaSchema.check(
        value39,
        joinPath(path, 'mfa'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    }
    if (json.containsKey('region')) {
      final value40 = json['region'];
      if (value40 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value40.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value40.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
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
        if (value41.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'apiBaseUrl'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value41.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'apiBaseUrl'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern5.hasMatch(value41)) {
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

/// Validation of [SignInResponse] against its contract.
extension SignInResponseValidation on SignInResponse {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => SignInResponseSchema.validate(toJson());
}

/// Validator for [MfaChallengeRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class MfaChallengeRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
    if (json.containsKey('method')) {
      final value43 = json['method'];
      if (value43 is! String ||
          !const <String>{
            'device_otp',
            'email_otp',
            'totp',
            'recovery_code',
            'passkey',
          }.contains(value43)) {
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

/// Validation of [MfaChallengeRequest] against its contract.
extension MfaChallengeRequestValidation on MfaChallengeRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => MfaChallengeRequestSchema.validate(toJson());
}

/// Validator for [MfaChallenge] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class MfaChallengeSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value44 = json['challengeId'];
      if (value44 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value44)) {
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
      final value45 = json['method'];
      if (value45 is! String ||
          !const <String>{
            'device_otp',
            'email_otp',
            'totp',
            'recovery_code',
            'passkey',
          }.contains(value45)) {
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
      final value46 = json['expiresAt'];
      if (value46 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'expiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value46)) {
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
      final value47 = json['codeLength'];
      if (value47 is! num ||
          !value47.isFinite ||
          value47 != value47.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'codeLength'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value47 < 6) {
          addFieldError(
            errors,
            joinPath(path, 'codeLength'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value47 > 64) {
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

/// Validation of [MfaChallenge] against its contract.
extension MfaChallengeValidation on MfaChallenge {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => MfaChallengeSchema.validate(toJson());
}

/// Validator for [MfaVerifyRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class MfaVerifyRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value48 = json['mfaToken'];
      if (value48 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value48.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value48.length > 2048) {
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
      final value49 = json['challengeId'];
      if (value49 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value49)) {
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
      final value50 = json['code'];
      if (value50 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value50.length < 6) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value50.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value50)) {
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
      final value51 = json['devicePublicKey'];
      if (value51 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'devicePublicKey'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value51.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value51.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value51)) {
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

/// Validation of [MfaVerifyRequest] against its contract.
extension MfaVerifyRequestValidation on MfaVerifyRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => MfaVerifyRequestSchema.validate(toJson());
}

/// Validator for [SessionTokenRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SessionTokenRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value52 = json['sessionToken'];
      if (value52 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value52.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'sessionToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value52.length > 8192) {
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

/// Validation of [SessionTokenRequest] against its contract.
extension SessionTokenRequestValidation on SessionTokenRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => SessionTokenRequestSchema.validate(toJson());
}

/// Validator for [StepUpVerifyRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class StepUpVerifyRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value53 = json['mfaToken'];
      if (value53 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value53.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value53.length > 2048) {
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
      final value54 = json['challengeId'];
      if (value54 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value54)) {
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
      final value55 = json['code'];
      if (value55 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value55.length < 6) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value55.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern6.hasMatch(value55)) {
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

/// Validation of [StepUpVerifyRequest] against its contract.
extension StepUpVerifyRequestValidation on StepUpVerifyRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => StepUpVerifyRequestSchema.validate(toJson());
}

/// Validator for [StepUpResult] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class StepUpResultSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value56 = json['tokens'];
      SessionTokensSchema.check(
        value56,
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
      final value57 = json['mfaVerifiedAt'];
      if (value57 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaVerifiedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value57)) {
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

/// Validation of [StepUpResult] against its contract.
extension StepUpResultValidation on StepUpResult {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => StepUpResultSchema.validate(toJson());
}

/// Validator for [SessionSummary] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SessionSummarySchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value58 = json['id'];
      if (value58 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value58)) {
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
      final value59 = json['deviceName'];
      if (value59 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value59.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value59.length > 120) {
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
      final value60 = json['platform'];
      if (value60 is! String ||
          !const <String>{
            'ios',
            'android',
            'web',
            'macos',
            'windows',
            'linux',
          }.contains(value60)) {
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
      final value61 = json['lastSeenAt'];
      if (value61 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'lastSeenAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value61)) {
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
      final value62 = json['current'];
      if (value62 is! bool) {
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

/// Validation of [SessionSummary] against its contract.
extension SessionSummaryValidation on SessionSummary {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => SessionSummarySchema.validate(toJson());
}

/// Validator for [SessionPage] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SessionPageSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value63 = json['items'];
      if (value63 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value63.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i64 = 0; i64 < value63.length; i64++) {
          final item65 = value63[i64];
          SessionSummarySchema.check(
            item65,
            joinPath(joinPath(path, 'items'), '$i64'),
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
      final value66 = json['nextCursor'];
      if (value66 != null) {
        if (value66 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value66.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value66.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value66)) {
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

/// Validation of [SessionPage] against its contract.
extension SessionPageValidation on SessionPage {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => SessionPageSchema.validate(toJson());
}

/// Validator for [DeviceSummary] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class DeviceSummarySchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value67 = json['id'];
      if (value67 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value67)) {
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
      final value68 = json['name'];
      if (value68 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value68.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value68.length > 120) {
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
      final value69 = json['platform'];
      if (value69 is! String ||
          !const <String>{
            'ios',
            'android',
            'web',
            'macos',
            'windows',
            'linux',
          }.contains(value69)) {
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
      final value70 = json['lastSeenAt'];
      if (value70 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'lastSeenAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value70)) {
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
      final value71 = json['trustedUntil'];
      if (value71 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'trustedUntil'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value71)) {
          addFieldError(
            errors,
            joinPath(path, 'trustedUntil'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    if (json.containsKey('verifier')) {
      final value72 = json['verifier'];
      if (value72 is! bool) {
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

/// Validation of [DeviceSummary] against its contract.
extension DeviceSummaryValidation on DeviceSummary {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => DeviceSummarySchema.validate(toJson());
}

/// Validator for [DevicePage] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class DevicePageSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value73 = json['items'];
      if (value73 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value73.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i74 = 0; i74 < value73.length; i74++) {
          final item75 = value73[i74];
          DeviceSummarySchema.check(
            item75,
            joinPath(joinPath(path, 'items'), '$i74'),
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
      final value76 = json['nextCursor'];
      if (value76 != null) {
        if (value76 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value76.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value76.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value76)) {
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

/// Validation of [DevicePage] against its contract.
extension DevicePageValidation on DevicePage {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => DevicePageSchema.validate(toJson());
}

/// Validator for [RevokeSessionRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class RevokeSessionRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value77 = json['sessionId'];
      if (value77 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value77)) {
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

/// Validation of [RevokeSessionRequest] against its contract.
extension RevokeSessionRequestValidation on RevokeSessionRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => RevokeSessionRequestSchema.validate(toJson());
}

/// Validator for [RevokedSessions] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class RevokedSessionsSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value78 = json['revoked'];
      if (value78 is! num ||
          !value78.isFinite ||
          value78 != value78.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'revoked'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value78 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'revoked'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value78 > 9007199254740991) {
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

/// Validation of [RevokedSessions] against its contract.
extension RevokedSessionsValidation on RevokedSessions {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => RevokedSessionsSchema.validate(toJson());
}

/// Validator for [RevokeUserSessionsInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class RevokeUserSessionsInputSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value79 = json['userId'];
      if (value79 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value79)) {
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
      final value80 = json['reason'];
      if (value80 is! String ||
          !const <String>{
            'logout',
            'user_action',
            'password_changed',
            'admin_action',
            'compromised',
          }.contains(value80)) {
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

/// Validation of [RevokeUserSessionsInput] against its contract.
extension RevokeUserSessionsInputValidation on RevokeUserSessionsInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      RevokeUserSessionsInputSchema.validate(toJson());
}

/// Validator for [GetUserAccessInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class GetUserAccessInputSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value81 = json['userId'];
      if (value81 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value81)) {
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
      final value82 = json['tenantId'];
      if (value82 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value82)) {
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

/// Validation of [GetUserAccessInput] against its contract.
extension GetUserAccessInputValidation on GetUserAccessInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => GetUserAccessInputSchema.validate(toJson());
}

/// Validator for [UserAccess] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UserAccessSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value83 = json['permissions'];
      if (value83 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i84 = 0; i84 < value83.length; i84++) {
          final item85 = value83[i84];
          if (item85 is! String ||
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
                  }.contains(item85))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i84'),
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
      final value86 = json['roles'];
      if (value86 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'roles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value86.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'roles'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i87 = 0; i87 < value86.length; i87++) {
          final item88 = value86[i87];
          if (item88 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'roles'), '$i87'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item88.isEmpty) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roles'), '$i87'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item88.length > 80) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roles'), '$i87'),
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
      final value89 = json['permissionVersion'];
      if (value89 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'permissionVersion'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value89.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'permissionVersion'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern7.hasMatch(value89)) {
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
      final value90 = json['platformRoles'];
      if (value90 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'platformRoles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i91 = 0; i91 < value90.length; i91++) {
          final item92 = value90[i91];
          if (item92 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'super_admin',
                    'support',
                    'finance',
                    'read_only',
                  }.contains(item92))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'platformRoles'), '$i91'),
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
      final value93 = json['features'];
      if (value93 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'features'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i94 = 0; i94 < value93.length; i94++) {
          final item95 = value93[i94];
          if (item95 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'ai_assistant',
                    'webhooks',
                    'billing',
                    'advanced_reports',
                  }.contains(item95))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'features'), '$i94'),
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
      final value96 = json['flags'];
      if (value96 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'flags'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i97 = 0; i97 < value96.length; i97++) {
          final item98 = value96[i97];
          if (item98 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{'new_reports'}.contains(item98))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'flags'), '$i97'),
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

/// Validation of [UserAccess] against its contract.
extension UserAccessValidation on UserAccess {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => UserAccessSchema.validate(toJson());
}

/// Validator for [SessionAccess] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SessionAccessSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value99 = json['userId'];
      if (value99 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value99)) {
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
      final value100 = json['tenantId'];
      if (value100 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value100)) {
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
      final value101 = json['sessionId'];
      if (value101 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value101)) {
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
      final value102 = json['permissions'];
      if (value102 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i103 = 0; i103 < value102.length; i103++) {
          final item104 = value102[i103];
          if (item104 is! String ||
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
                  }.contains(item104))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i103'),
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
      final value105 = json['roles'];
      if (value105 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'roles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value105.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'roles'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i106 = 0; i106 < value105.length; i106++) {
          final item107 = value105[i106];
          if (item107 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'roles'), '$i106'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item107.isEmpty) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roles'), '$i106'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item107.length > 80) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roles'), '$i106'),
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
      final value108 = json['permissionVersion'];
      if (value108 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'permissionVersion'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value108.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'permissionVersion'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern7.hasMatch(value108)) {
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
      final value109 = json['platformRoles'];
      if (value109 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'platformRoles'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i110 = 0; i110 < value109.length; i110++) {
          final item111 = value109[i110];
          if (item111 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'super_admin',
                    'support',
                    'finance',
                    'read_only',
                  }.contains(item111))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'platformRoles'), '$i110'),
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
      final value112 = json['features'];
      if (value112 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'features'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i113 = 0; i113 < value112.length; i113++) {
          final item114 = value112[i113];
          if (item114 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'ai_assistant',
                    'webhooks',
                    'billing',
                    'advanced_reports',
                  }.contains(item114))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'features'), '$i113'),
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
      final value115 = json['flags'];
      if (value115 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'flags'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        for (var i116 = 0; i116 < value115.length; i116++) {
          final item117 = value115[i116];
          if (item117 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{'new_reports'}.contains(item117))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'flags'), '$i116'),
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
      final value118 = json['mfaVerifiedAt'];
      if (value118 != null) {
        if (value118 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'mfaVerifiedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern2.hasMatch(value118)) {
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

/// Validation of [SessionAccess] against its contract.
extension SessionAccessValidation on SessionAccess {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => SessionAccessSchema.validate(toJson());
}

/// Validator for [SessionRevokedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SessionRevokedPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value119 = json['sessionId'];
      if (value119 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sessionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value119)) {
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
      final value120 = json['userId'];
      if (value120 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value120)) {
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
      final value121 = json['tenantId'];
      if (value121 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value121)) {
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
      final value122 = json['reason'];
      if (value122 is! String ||
          !const <String>{
            'logout',
            'user_action',
            'password_changed',
            'admin_action',
            'compromised',
          }.contains(value122)) {
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
      final value123 = json['revokedAt'];
      if (value123 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'revokedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value123)) {
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

/// Validation of [SessionRevokedPayload] against its contract.
extension SessionRevokedPayloadValidation on SessionRevokedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => SessionRevokedPayloadSchema.validate(toJson());
}

/// Validator for [TokensRevokedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TokensRevokedPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value124 = json['scope'];
      if (value124 is! String ||
          !const <String>{'session', 'user', 'tenant'}.contains(value124)) {
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
      final value125 = json['subjectId'];
      if (value125 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'subjectId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value125)) {
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
      final value126 = json['revokedBefore'];
      if (value126 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'revokedBefore'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value126)) {
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

/// Validation of [TokensRevokedPayload] against its contract.
extension TokensRevokedPayloadValidation on TokensRevokedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => TokensRevokedPayloadSchema.validate(toJson());
}

/// Validator for [SignUpRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SignUpRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value127 = json['email'];
      if (value127 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value127.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern4.hasMatch(value127)) {
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
      final value128 = json['password'];
      if (value128 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'password'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value128.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'password'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value128.length > 128) {
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
      final value129 = json['displayName'];
      if (value129 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'displayName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value129.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value129.length > 120) {
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
      final value130 = json['locale'];
      if (value130 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'locale'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value130.length < 2) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value130.length > 35) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern8.hasMatch(value130)) {
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
      final value131 = json['invitationToken'];
      if (value131 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invitationToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value131.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'invitationToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value131.length > 512) {
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

/// Validation of [SignUpRequest] against its contract.
extension SignUpRequestValidation on SignUpRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => SignUpRequestSchema.validate(toJson());
}

/// Validator for [EmailVerificationRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class EmailVerificationRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value132 = json['email'];
      if (value132 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value132.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern4.hasMatch(value132)) {
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

/// Validation of [EmailVerificationRequest] against its contract.
extension EmailVerificationRequestValidation on EmailVerificationRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      EmailVerificationRequestSchema.validate(toJson());
}

/// Validator for [EmailVerificationConfirmRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class EmailVerificationConfirmRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value133 = json['token'];
      if (value133 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'token'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value133.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value133.length > 512) {
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

/// Validation of [EmailVerificationConfirmRequest] against its contract.
extension EmailVerificationConfirmRequestValidation
    on EmailVerificationConfirmRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      EmailVerificationConfirmRequestSchema.validate(toJson());
}

/// Validator for [UserProfile] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UserProfileSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value134 = json['id'];
      if (value134 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value134)) {
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
      final value135 = json['email'];
      if (value135 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value135.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern4.hasMatch(value135)) {
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
      final value136 = json['emailVerifiedAt'];
      if (value136 != null) {
        if (value136 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'emailVerifiedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern2.hasMatch(value136)) {
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
      final value137 = json['displayName'];
      if (value137 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'displayName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value137.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value137.length > 120) {
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
      final value138 = json['locale'];
      if (value138 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'locale'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value138.length < 2) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value138.length > 35) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern8.hasMatch(value138)) {
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
      final value139 = json['status'];
      if (value139 is! String ||
          !const <String>{
            'pending_verification',
            'active',
            'suspended',
            'deleted',
          }.contains(value139)) {
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
      final value140 = json['homeTenantId'];
      if (value140 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'homeTenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value140)) {
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
      final value141 = json['lastTenantId'];
      if (value141 != null) {
        if (value141 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'lastTenantId'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern0.hasMatch(value141)) {
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

/// Validation of [UserProfile] against its contract.
extension UserProfileValidation on UserProfile {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => UserProfileSchema.validate(toJson());
}

/// Validator for [UpdateProfileRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UpdateProfileRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value142 = json['displayName'];
      if (value142 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'displayName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value142.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value142.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('locale')) {
      final value143 = json['locale'];
      if (value143 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'locale'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value143.length < 2) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value143.length > 35) {
          addFieldError(
            errors,
            joinPath(path, 'locale'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern8.hasMatch(value143)) {
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

/// Validation of [UpdateProfileRequest] against its contract.
extension UpdateProfileRequestValidation on UpdateProfileRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => UpdateProfileRequestSchema.validate(toJson());
}

/// Validator for [EmailChangeRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class EmailChangeRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value144 = json['newEmail'];
      if (value144 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'newEmail'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value144.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'newEmail'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern4.hasMatch(value144)) {
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

/// Validation of [EmailChangeRequest] against its contract.
extension EmailChangeRequestValidation on EmailChangeRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => EmailChangeRequestSchema.validate(toJson());
}

/// Validator for [EmailChangeConfirmRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class EmailChangeConfirmRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value145 = json['token'];
      if (value145 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'token'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value145.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value145.length > 512) {
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

/// Validation of [EmailChangeConfirmRequest] against its contract.
extension EmailChangeConfirmRequestValidation on EmailChangeConfirmRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      EmailChangeConfirmRequestSchema.validate(toJson());
}

/// Validator for [SuspendUserInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SuspendUserInputSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value146 = json['userId'];
      if (value146 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value146)) {
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
      final value147 = json['reason'];
      if (value147 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reason'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value147.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value147.length > 200) {
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

/// Validation of [SuspendUserInput] against its contract.
extension SuspendUserInputValidation on SuspendUserInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => SuspendUserInputSchema.validate(toJson());
}

/// Validator for [ReactivateUserInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ReactivateUserInputSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value148 = json['userId'];
      if (value148 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value148)) {
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

/// Validation of [ReactivateUserInput] against its contract.
extension ReactivateUserInputValidation on ReactivateUserInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ReactivateUserInputSchema.validate(toJson());
}

/// Validator for [UserOperationResult] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UserOperationResultSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value149 = json['userId'];
      if (value149 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value149)) {
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
      final value150 = json['status'];
      if (value150 is! String ||
          !const <String>{
            'pending_verification',
            'active',
            'suspended',
            'deleted',
          }.contains(value150)) {
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

/// Validation of [UserOperationResult] against its contract.
extension UserOperationResultValidation on UserOperationResult {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => UserOperationResultSchema.validate(toJson());
}

/// Validator for [GetUserProfileInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class GetUserProfileInputSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value151 = json['userId'];
      if (value151 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value151)) {
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

/// Validation of [GetUserProfileInput] against its contract.
extension GetUserProfileInputValidation on GetUserProfileInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => GetUserProfileInputSchema.validate(toJson());
}

/// Validator for [ChangePasswordRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ChangePasswordRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value152 = json['currentPassword'];
      if (value152 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'currentPassword'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value152.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'currentPassword'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value152.length > 128) {
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
      final value153 = json['newPassword'];
      if (value153 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'newPassword'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value153.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'newPassword'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value153.length > 128) {
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

/// Validation of [ChangePasswordRequest] against its contract.
extension ChangePasswordRequestValidation on ChangePasswordRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ChangePasswordRequestSchema.validate(toJson());
}

/// Validator for [PasswordResetRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PasswordResetRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value154 = json['email'];
      if (value154 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value154.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern4.hasMatch(value154)) {
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

/// Validation of [PasswordResetRequest] against its contract.
extension PasswordResetRequestValidation on PasswordResetRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => PasswordResetRequestSchema.validate(toJson());
}

/// Validator for [PasswordResetConfirmRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PasswordResetConfirmRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value155 = json['token'];
      if (value155 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'token'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value155.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value155.length > 512) {
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
      final value156 = json['newPassword'];
      if (value156 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'newPassword'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value156.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'newPassword'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value156.length > 128) {
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

/// Validation of [PasswordResetConfirmRequest] against its contract.
extension PasswordResetConfirmRequestValidation on PasswordResetConfirmRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      PasswordResetConfirmRequestSchema.validate(toJson());
}

/// Validator for [RemoveDeviceRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class RemoveDeviceRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value157 = json['deviceId'];
      if (value157 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value157)) {
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

/// Validation of [RemoveDeviceRequest] against its contract.
extension RemoveDeviceRequestValidation on RemoveDeviceRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => RemoveDeviceRequestSchema.validate(toJson());
}

/// Validator for [UntrustDeviceRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UntrustDeviceRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value158 = json['deviceId'];
      if (value158 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value158)) {
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

/// Validation of [UntrustDeviceRequest] against its contract.
extension UntrustDeviceRequestValidation on UntrustDeviceRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => UntrustDeviceRequestSchema.validate(toJson());
}

/// Validator for [PushTokenRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PushTokenRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value159 = json['pushToken'];
      if (value159 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'pushToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value159.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'pushToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value159.length > 512) {
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

/// Validation of [PushTokenRequest] against its contract.
extension PushTokenRequestValidation on PushTokenRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => PushTokenRequestSchema.validate(toJson());
}

/// Validator for [PullDeviceApprovalsRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PullDeviceApprovalsRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value160 = json['deviceId'];
      if (value160 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value160.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value160.length > 512) {
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
      final value161 = json['timestamp'];
      if (value161 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'timestamp'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value161)) {
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
      final value162 = json['nonce'];
      if (value162 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'nonce'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value162.length < 16) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value162.length > 128) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value162)) {
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
      final value163 = json['signature'];
      if (value163 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'signature'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value163.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value163.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value163)) {
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

/// Validation of [PullDeviceApprovalsRequest] against its contract.
extension PullDeviceApprovalsRequestValidation on PullDeviceApprovalsRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      PullDeviceApprovalsRequestSchema.validate(toJson());
}

/// Validator for [DenyDeviceApprovalRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class DenyDeviceApprovalRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value164 = json['challengeId'];
      if (value164 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value164)) {
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
      final value165 = json['deviceId'];
      if (value165 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value165.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'deviceId'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value165.length > 512) {
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
      final value166 = json['timestamp'];
      if (value166 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'timestamp'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value166)) {
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
      final value167 = json['nonce'];
      if (value167 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'nonce'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value167.length < 16) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value167.length > 128) {
          addFieldError(
            errors,
            joinPath(path, 'nonce'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value167)) {
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
      final value168 = json['signature'];
      if (value168 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'signature'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value168.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value168.length > 256) {
          addFieldError(
            errors,
            joinPath(path, 'signature'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value168)) {
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

/// Validation of [DenyDeviceApprovalRequest] against its contract.
extension DenyDeviceApprovalRequestValidation on DenyDeviceApprovalRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      DenyDeviceApprovalRequestSchema.validate(toJson());
}

/// Validator for [ApprovalContext] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ApprovalContextSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value169 = json['browser'];
      if (value169 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'browser'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value169.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'browser'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value169.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'browser'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('os')) {
      final value170 = json['os'];
      if (value170 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'os'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value170.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'os'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value170.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'os'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('ip')) {
      final value171 = json['ip'];
      if (value171 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'ip'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value171.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'ip'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value171.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'ip'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('city')) {
      final value172 = json['city'];
      if (value172 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'city'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value172.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'city'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value172.length > 120) {
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

/// Validation of [ApprovalContext] against its contract.
extension ApprovalContextValidation on ApprovalContext {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ApprovalContextSchema.validate(toJson());
}

/// Validator for [DeviceApproval] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class DeviceApprovalSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value173 = json['challengeId'];
      if (value173 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value173)) {
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
      final value174 = json['code'];
      if (value174 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value174.length < 6) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value174.length > 64) {
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
      final value175 = json['requestedAt'];
      if (value175 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'requestedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value175)) {
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
      final value176 = json['expiresAt'];
      if (value176 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'expiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value176)) {
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
      final value177 = json['context'];
      ApprovalContextSchema.check(
        value177,
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

/// Validation of [DeviceApproval] against its contract.
extension DeviceApprovalValidation on DeviceApproval {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => DeviceApprovalSchema.validate(toJson());
}

/// Validator for [DeviceApprovals] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class DeviceApprovalsSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value178 = json['approvals'];
      if (value178 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'approvals'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value178.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'approvals'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i179 = 0; i179 < value178.length; i179++) {
          final item180 = value178[i179];
          DeviceApprovalSchema.check(
            item180,
            joinPath(joinPath(path, 'approvals'), '$i179'),
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

/// Validation of [DeviceApprovals] against its contract.
extension DeviceApprovalsValidation on DeviceApprovals {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => DeviceApprovalsSchema.validate(toJson());
}

/// Validator for [TotpEnrollment] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TotpEnrollmentSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value181 = json['secret'];
      if (value181 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'secret'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value181.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'secret'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value181.length > 128) {
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
      final value182 = json['otpauthUri'];
      if (value182 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'otpauthUri'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value182.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'otpauthUri'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value182.length > 512) {
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

/// Validation of [TotpEnrollment] against its contract.
extension TotpEnrollmentValidation on TotpEnrollment {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => TotpEnrollmentSchema.validate(toJson());
}

/// Validator for [TotpConfirmRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TotpConfirmRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value183 = json['code'];
      if (value183 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'code'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value183.length < 6) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value183.length > 8) {
          addFieldError(
            errors,
            joinPath(path, 'code'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern9.hasMatch(value183)) {
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

/// Validation of [TotpConfirmRequest] against its contract.
extension TotpConfirmRequestValidation on TotpConfirmRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => TotpConfirmRequestSchema.validate(toJson());
}

/// Validator for [RecoveryCodes] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class RecoveryCodesSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value184 = json['codes'];
      if (value184 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'codes'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value184.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'codes'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i185 = 0; i185 < value184.length; i185++) {
          final item186 = value184[i185];
          if (item186 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'codes'), '$i185'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item186.length < 8) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'codes'), '$i185'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item186.length > 64) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'codes'), '$i185'),
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

/// Validation of [RecoveryCodes] against its contract.
extension RecoveryCodesValidation on RecoveryCodes {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => RecoveryCodesSchema.validate(toJson());
}

/// Validator for [MfaRecoveryStartRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class MfaRecoveryStartRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value187 = json['mfaToken'];
      if (value187 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value187.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value187.length > 2048) {
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

/// Validation of [MfaRecoveryStartRequest] against its contract.
extension MfaRecoveryStartRequestValidation on MfaRecoveryStartRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      MfaRecoveryStartRequestSchema.validate(toJson());
}

/// Validator for [MfaRecoveryStarted] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class MfaRecoveryStartedSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value188 = json['availableAt'];
      if (value188 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'availableAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value188)) {
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

/// Validation of [MfaRecoveryStarted] against its contract.
extension MfaRecoveryStartedValidation on MfaRecoveryStarted {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => MfaRecoveryStartedSchema.validate(toJson());
}

/// Validator for [MfaRecoveryConfirmRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class MfaRecoveryConfirmRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value189 = json['mfaToken'];
      if (value189 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value189.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value189.length > 2048) {
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
      final value190 = json['token'];
      if (value190 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'token'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value190.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value190.length > 512) {
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
      final value191 = json['devicePublicKey'];
      if (value191 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'devicePublicKey'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value191.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value191.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value191)) {
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

/// Validation of [MfaRecoveryConfirmRequest] against its contract.
extension MfaRecoveryConfirmRequestValidation on MfaRecoveryConfirmRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      MfaRecoveryConfirmRequestSchema.validate(toJson());
}

/// Validator for [PasskeyOptions] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PasskeyOptionsSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value192 = json['challengeId'];
      if (value192 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value192)) {
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
      final value193 = json['optionsJson'];
      if (value193 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'optionsJson'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value193.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'optionsJson'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value193.length > 8192) {
          addFieldError(
            errors,
            joinPath(path, 'optionsJson'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value193)) {
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

/// Validation of [PasskeyOptions] against its contract.
extension PasskeyOptionsValidation on PasskeyOptions {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => PasskeyOptionsSchema.validate(toJson());
}

/// Validator for [PasskeySignInVerifyRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PasskeySignInVerifyRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value194 = json['challengeId'];
      if (value194 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value194)) {
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
      final value195 = json['credentialJson'];
      if (value195 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'credentialJson'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value195.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value195.length > 16384) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value195)) {
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
    if (json.containsKey('device')) {
      final value196 = json['device'];
      DeviceSignatureFieldsSchema.check(
        value196,
        joinPath(path, 'device'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{
        'challengeId',
        'credentialJson',
        'device',
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

/// Validation of [PasskeySignInVerifyRequest] against its contract.
extension PasskeySignInVerifyRequestValidation on PasskeySignInVerifyRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      PasskeySignInVerifyRequestSchema.validate(toJson());
}

/// Validator for [PasskeyMfaOptionsRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PasskeyMfaOptionsRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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

/// Validation of [PasskeyMfaOptionsRequest] against its contract.
extension PasskeyMfaOptionsRequestValidation on PasskeyMfaOptionsRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      PasskeyMfaOptionsRequestSchema.validate(toJson());
}

/// Validator for [PasskeyMfaVerifyRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PasskeyMfaVerifyRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
    if (json.containsKey('challengeId')) {
      final value199 = json['challengeId'];
      if (value199 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value199)) {
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
      final value200 = json['credentialJson'];
      if (value200 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'credentialJson'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value200.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value200.length > 16384) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value200)) {
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
      final value201 = json['devicePublicKey'];
      if (value201 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'devicePublicKey'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value201.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value201.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'devicePublicKey'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value201)) {
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

/// Validation of [PasskeyMfaVerifyRequest] against its contract.
extension PasskeyMfaVerifyRequestValidation on PasskeyMfaVerifyRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      PasskeyMfaVerifyRequestSchema.validate(toJson());
}

/// Validator for [PasskeyStepUpOptionsRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PasskeyStepUpOptionsRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value202 = json['mfaToken'];
      if (value202 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value202.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value202.length > 2048) {
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

/// Validation of [PasskeyStepUpOptionsRequest] against its contract.
extension PasskeyStepUpOptionsRequestValidation on PasskeyStepUpOptionsRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      PasskeyStepUpOptionsRequestSchema.validate(toJson());
}

/// Validator for [PasskeyStepUpVerifyRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PasskeyStepUpVerifyRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value203 = json['mfaToken'];
      if (value203 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'mfaToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value203.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'mfaToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value203.length > 2048) {
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
      final value204 = json['challengeId'];
      if (value204 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value204)) {
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
      final value205 = json['credentialJson'];
      if (value205 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'credentialJson'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value205.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value205.length > 16384) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value205)) {
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

/// Validation of [PasskeyStepUpVerifyRequest] against its contract.
extension PasskeyStepUpVerifyRequestValidation on PasskeyStepUpVerifyRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      PasskeyStepUpVerifyRequestSchema.validate(toJson());
}

/// Validator for [PasskeySummary] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PasskeySummarySchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value206 = json['id'];
      if (value206 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value206)) {
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
      final value207 = json['name'];
      if (value207 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value207.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value207.length > 120) {
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
      final value208 = json['createdAt'];
      if (value208 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value208)) {
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
      final value209 = json['lastUsedAt'];
      if (value209 != null) {
        if (value209 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'lastUsedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern2.hasMatch(value209)) {
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
      final value210 = json['backedUp'];
      if (value210 is! bool) {
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

/// Validation of [PasskeySummary] against its contract.
extension PasskeySummaryValidation on PasskeySummary {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => PasskeySummarySchema.validate(toJson());
}

/// Validator for [PasskeyPage] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PasskeyPageSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value211 = json['items'];
      if (value211 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value211.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i212 = 0; i212 < value211.length; i212++) {
          final item213 = value211[i212];
          PasskeySummarySchema.check(
            item213,
            joinPath(joinPath(path, 'items'), '$i212'),
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
      final value214 = json['nextCursor'];
      if (value214 != null) {
        if (value214 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value214.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value214.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value214)) {
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

/// Validation of [PasskeyPage] against its contract.
extension PasskeyPageValidation on PasskeyPage {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => PasskeyPageSchema.validate(toJson());
}

/// Validator for [RegisterPasskeyRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class RegisterPasskeyRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value215 = json['challengeId'];
      if (value215 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'challengeId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value215)) {
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
      final value216 = json['credentialJson'];
      if (value216 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'credentialJson'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value216.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value216.length > 16384) {
          addFieldError(
            errors,
            joinPath(path, 'credentialJson'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value216)) {
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

/// Validation of [RegisterPasskeyRequest] against its contract.
extension RegisterPasskeyRequestValidation on RegisterPasskeyRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      RegisterPasskeyRequestSchema.validate(toJson());
}

/// Validator for [RemovePasskeyRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class RemovePasskeyRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value218 = json['passkeyId'];
      if (value218 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'passkeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value218)) {
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

/// Validation of [RemovePasskeyRequest] against its contract.
extension RemovePasskeyRequestValidation on RemovePasskeyRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => RemovePasskeyRequestSchema.validate(toJson());
}

/// Validator for [TenantSummary] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantSummarySchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value219 = json['id'];
      if (value219 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value219)) {
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
      final value220 = json['slug'];
      if (value220 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'slug'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value220.length < 3) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value220.length > 63) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern10.hasMatch(value220)) {
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
      final value221 = json['name'];
      if (value221 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value221.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value221.length > 120) {
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
      final value222 = json['region'];
      if (value222 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value222.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value222.length > 32) {
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
      final value223 = json['kind'];
      if (value223 is! String ||
          !const <String>{
            'organization',
            'shared_customers',
            'platform',
          }.contains(value223)) {
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
      final value224 = json['status'];
      if (value224 is! String ||
          !const <String>{
            'provisioning',
            'active',
            'suspended',
            'deleting',
          }.contains(value224)) {
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

/// Validation of [TenantSummary] against its contract.
extension TenantSummaryValidation on TenantSummary {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => TenantSummarySchema.validate(toJson());
}

/// Validator for [CreateTenantRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class CreateTenantRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value225 = json['slug'];
      if (value225 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'slug'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value225.length < 3) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value225.length > 63) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern10.hasMatch(value225)) {
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
      final value226 = json['name'];
      if (value226 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value226.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value226.length > 120) {
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
      final value227 = json['region'];
      if (value227 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value227.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value227.length > 32) {
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

/// Validation of [CreateTenantRequest] against its contract.
extension CreateTenantRequestValidation on CreateTenantRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => CreateTenantRequestSchema.validate(toJson());
}

/// Validator for [UpdateTenantRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UpdateTenantRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value228 = json['name'];
      if (value228 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value228.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value228.length > 120) {
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

/// Validation of [UpdateTenantRequest] against its contract.
extension UpdateTenantRequestValidation on UpdateTenantRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => UpdateTenantRequestSchema.validate(toJson());
}

/// Validator for [MyTenantSummary] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class MyTenantSummarySchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value229 = json['id'];
      if (value229 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value229)) {
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
      final value230 = json['slug'];
      if (value230 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'slug'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value230.length < 3) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value230.length > 63) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern10.hasMatch(value230)) {
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
      final value231 = json['name'];
      if (value231 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value231.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value231.length > 120) {
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
      final value232 = json['kind'];
      if (value232 is! String ||
          !const <String>{
            'organization',
            'shared_customers',
            'platform',
          }.contains(value232)) {
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
      final value233 = json['status'];
      if (value233 is! String ||
          !const <String>{
            'provisioning',
            'active',
            'suspended',
            'deleting',
          }.contains(value233)) {
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
      final value234 = json['joinedAt'];
      if (value234 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'joinedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value234)) {
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

/// Validation of [MyTenantSummary] against its contract.
extension MyTenantSummaryValidation on MyTenantSummary {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => MyTenantSummarySchema.validate(toJson());
}

/// Validator for [MyTenantPage] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class MyTenantPageSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value235 = json['items'];
      if (value235 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value235.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i236 = 0; i236 < value235.length; i236++) {
          final item237 = value235[i236];
          MyTenantSummarySchema.check(
            item237,
            joinPath(joinPath(path, 'items'), '$i236'),
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
      final value238 = json['nextCursor'];
      if (value238 != null) {
        if (value238 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value238.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value238.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value238)) {
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

/// Validation of [MyTenantPage] against its contract.
extension MyTenantPageValidation on MyTenantPage {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => MyTenantPageSchema.validate(toJson());
}

/// Validator for [SwitchTenantRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SwitchTenantRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value239 = json['tenantId'];
      if (value239 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value239)) {
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

/// Validation of [SwitchTenantRequest] against its contract.
extension SwitchTenantRequestValidation on SwitchTenantRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => SwitchTenantRequestSchema.validate(toJson());
}

/// Validator for [TenantOperationResult] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantOperationResultSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value240 = json['tenantId'];
      if (value240 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value240)) {
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
      final value241 = json['status'];
      if (value241 is! String ||
          !const <String>{
            'provisioning',
            'active',
            'suspended',
            'deleting',
          }.contains(value241)) {
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

/// Validation of [TenantOperationResult] against its contract.
extension TenantOperationResultValidation on TenantOperationResult {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => TenantOperationResultSchema.validate(toJson());
}

/// Validator for [CreateTenantInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class CreateTenantInputSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
    if (json.containsKey('slug')) {
      final value243 = json['slug'];
      if (value243 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'slug'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value243.length < 3) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value243.length > 63) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern10.hasMatch(value243)) {
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
      final value244 = json['name'];
      if (value244 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value244.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value244.length > 120) {
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
      final value245 = json['region'];
      if (value245 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value245.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value245.length > 32) {
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
      final value246 = json['kind'];
      if (value246 is! String ||
          !const <String>{
            'organization',
            'shared_customers',
            'platform',
          }.contains(value246)) {
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
      final value247 = json['ownerUserId'];
      if (value247 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'ownerUserId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value247)) {
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

/// Validation of [CreateTenantInput] against its contract.
extension CreateTenantInputValidation on CreateTenantInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => CreateTenantInputSchema.validate(toJson());
}

/// Validator for [TenantRefInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantRefInputSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value248 = json['tenantId'];
      if (value248 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value248)) {
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

/// Validation of [TenantRefInput] against its contract.
extension TenantRefInputValidation on TenantRefInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => TenantRefInputSchema.validate(toJson());
}

/// Validator for [SuspendTenantInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SuspendTenantInputSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value249 = json['tenantId'];
      if (value249 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value249)) {
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
      final value250 = json['reason'];
      if (value250 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reason'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value250.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value250.length > 200) {
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

/// Validation of [SuspendTenantInput] against its contract.
extension SuspendTenantInputValidation on SuspendTenantInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => SuspendTenantInputSchema.validate(toJson());
}

/// Validator for [MemberSummary] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class MemberSummarySchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value251 = json['userId'];
      if (value251 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value251)) {
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
      final value252 = json['email'];
      if (value252 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value252.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern4.hasMatch(value252)) {
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
      final value253 = json['displayName'];
      if (value253 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'displayName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value253.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'displayName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value253.length > 120) {
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
      final value254 = json['groupIds'];
      if (value254 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groupIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value254.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'groupIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i255 = 0; i255 < value254.length; i255++) {
          final item256 = value254[i255];
          if (item256 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groupIds'), '$i255'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item256)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groupIds'), '$i255'),
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
      final value257 = json['joinedAt'];
      if (value257 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'joinedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value257)) {
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

/// Validation of [MemberSummary] against its contract.
extension MemberSummaryValidation on MemberSummary {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => MemberSummarySchema.validate(toJson());
}

/// Validator for [MemberPage] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class MemberPageSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value258 = json['items'];
      if (value258 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value258.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i259 = 0; i259 < value258.length; i259++) {
          final item260 = value258[i259];
          MemberSummarySchema.check(
            item260,
            joinPath(joinPath(path, 'items'), '$i259'),
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
      final value261 = json['nextCursor'];
      if (value261 != null) {
        if (value261 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value261.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value261.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value261)) {
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

/// Validation of [MemberPage] against its contract.
extension MemberPageValidation on MemberPage {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => MemberPageSchema.validate(toJson());
}

/// Validator for [RemoveMemberRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class RemoveMemberRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value262 = json['userId'];
      if (value262 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value262)) {
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

/// Validation of [RemoveMemberRequest] against its contract.
extension RemoveMemberRequestValidation on RemoveMemberRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => RemoveMemberRequestSchema.validate(toJson());
}

/// Validator for [SetMemberGroupsRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SetMemberGroupsRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value263 = json['userId'];
      if (value263 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value263)) {
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
      final value264 = json['groupIds'];
      if (value264 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groupIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value264.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'groupIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i265 = 0; i265 < value264.length; i265++) {
          final item266 = value264[i265];
          if (item266 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groupIds'), '$i265'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item266)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groupIds'), '$i265'),
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

/// Validation of [SetMemberGroupsRequest] against its contract.
extension SetMemberGroupsRequestValidation on SetMemberGroupsRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      SetMemberGroupsRequestSchema.validate(toJson());
}

/// Validator for [GroupSummary] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class GroupSummarySchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value267 = json['id'];
      if (value267 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value267)) {
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
      final value268 = json['name'];
      if (value268 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value268.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value268.length > 80) {
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
      final value269 = json['system'];
      if (value269 is! bool) {
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
      final value270 = json['roleIds'];
      if (value270 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'roleIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value270.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'roleIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i271 = 0; i271 < value270.length; i271++) {
          final item272 = value270[i271];
          if (item272 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'roleIds'), '$i271'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item272)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roleIds'), '$i271'),
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
      final value273 = json['memberCount'];
      if (value273 is! num ||
          !value273.isFinite ||
          value273 != value273.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'memberCount'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value273 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'memberCount'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value273 > 9007199254740991) {
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

/// Validation of [GroupSummary] against its contract.
extension GroupSummaryValidation on GroupSummary {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => GroupSummarySchema.validate(toJson());
}

/// Validator for [GroupPage] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class GroupPageSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value274 = json['items'];
      if (value274 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value274.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i275 = 0; i275 < value274.length; i275++) {
          final item276 = value274[i275];
          GroupSummarySchema.check(
            item276,
            joinPath(joinPath(path, 'items'), '$i275'),
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
      final value277 = json['nextCursor'];
      if (value277 != null) {
        if (value277 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value277.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value277.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value277)) {
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

/// Validation of [GroupPage] against its contract.
extension GroupPageValidation on GroupPage {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => GroupPageSchema.validate(toJson());
}

/// Validator for [CreateGroupRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class CreateGroupRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value278 = json['name'];
      if (value278 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value278.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value278.length > 80) {
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

/// Validation of [CreateGroupRequest] against its contract.
extension CreateGroupRequestValidation on CreateGroupRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => CreateGroupRequestSchema.validate(toJson());
}

/// Validator for [UpdateGroupRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UpdateGroupRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value279 = json['groupId'];
      if (value279 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'groupId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value279)) {
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
      final value280 = json['name'];
      if (value280 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value280.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value280.length > 80) {
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

/// Validation of [UpdateGroupRequest] against its contract.
extension UpdateGroupRequestValidation on UpdateGroupRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => UpdateGroupRequestSchema.validate(toJson());
}

/// Validator for [DeleteGroupRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class DeleteGroupRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value281 = json['groupId'];
      if (value281 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'groupId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value281)) {
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

/// Validation of [DeleteGroupRequest] against its contract.
extension DeleteGroupRequestValidation on DeleteGroupRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => DeleteGroupRequestSchema.validate(toJson());
}

/// Validator for [SetGroupRolesRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SetGroupRolesRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value282 = json['groupId'];
      if (value282 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'groupId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value282)) {
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
      final value283 = json['roleIds'];
      if (value283 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'roleIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value283.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'roleIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i284 = 0; i284 < value283.length; i284++) {
          final item285 = value283[i284];
          if (item285 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'roleIds'), '$i284'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item285)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'roleIds'), '$i284'),
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

/// Validation of [SetGroupRolesRequest] against its contract.
extension SetGroupRolesRequestValidation on SetGroupRolesRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => SetGroupRolesRequestSchema.validate(toJson());
}

/// Validator for [RoleSummary] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class RoleSummarySchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value286 = json['id'];
      if (value286 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value286)) {
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
      final value287 = json['name'];
      if (value287 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value287.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value287.length > 80) {
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
      final value288 = json['systemRole'];
      if (value288 != null) {
        if (value288 is! String ||
            !const <String>{
              'owner',
              'admin',
              'member',
              'billing',
            }.contains(value288)) {
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
      final value289 = json['permissions'];
      if (value289 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value289.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i290 = 0; i290 < value289.length; i290++) {
          final item291 = value289[i290];
          if (item291 is! String ||
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
                  }.contains(item291))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i290'),
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

/// Validation of [RoleSummary] against its contract.
extension RoleSummaryValidation on RoleSummary {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => RoleSummarySchema.validate(toJson());
}

/// Validator for [RolePage] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class RolePageSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value292 = json['items'];
      if (value292 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value292.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i293 = 0; i293 < value292.length; i293++) {
          final item294 = value292[i293];
          RoleSummarySchema.check(
            item294,
            joinPath(joinPath(path, 'items'), '$i293'),
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
      final value295 = json['nextCursor'];
      if (value295 != null) {
        if (value295 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value295.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value295.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value295)) {
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

/// Validation of [RolePage] against its contract.
extension RolePageValidation on RolePage {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => RolePageSchema.validate(toJson());
}

/// Validator for [CreateRoleRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class CreateRoleRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value296 = json['name'];
      if (value296 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value296.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value296.length > 80) {
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
      final value297 = json['permissions'];
      if (value297 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value297.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i298 = 0; i298 < value297.length; i298++) {
          final item299 = value297[i298];
          if (item299 is! String ||
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
                  }.contains(item299))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i298'),
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

/// Validation of [CreateRoleRequest] against its contract.
extension CreateRoleRequestValidation on CreateRoleRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => CreateRoleRequestSchema.validate(toJson());
}

/// Validator for [UpdateRoleRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UpdateRoleRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value300 = json['roleId'];
      if (value300 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'roleId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value300)) {
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
      final value301 = json['name'];
      if (value301 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value301.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value301.length > 80) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('permissions')) {
      final value302 = json['permissions'];
      if (value302 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value302.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i303 = 0; i303 < value302.length; i303++) {
          final item304 = value302[i303];
          if (item304 is! String ||
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
                  }.contains(item304))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i303'),
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

/// Validation of [UpdateRoleRequest] against its contract.
extension UpdateRoleRequestValidation on UpdateRoleRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => UpdateRoleRequestSchema.validate(toJson());
}

/// Validator for [DeleteRoleRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class DeleteRoleRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value305 = json['roleId'];
      if (value305 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'roleId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value305)) {
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

/// Validation of [DeleteRoleRequest] against its contract.
extension DeleteRoleRequestValidation on DeleteRoleRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => DeleteRoleRequestSchema.validate(toJson());
}

/// Validator for [InvitationSummary] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class InvitationSummarySchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value306 = json['id'];
      if (value306 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value306)) {
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
      final value307 = json['email'];
      if (value307 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value307.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern4.hasMatch(value307)) {
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
      final value308 = json['groupIds'];
      if (value308 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groupIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value308.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'groupIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i309 = 0; i309 < value308.length; i309++) {
          final item310 = value308[i309];
          if (item310 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groupIds'), '$i309'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item310)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groupIds'), '$i309'),
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
      final value311 = json['status'];
      if (value311 is! String ||
          !const <String>{
            'pending',
            'accepted',
            'revoked',
            'expired',
          }.contains(value311)) {
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
      final value312 = json['expiresAt'];
      if (value312 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'expiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value312)) {
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
      final value313 = json['invitedBy'];
      if (value313 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invitedBy'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value313)) {
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

/// Validation of [InvitationSummary] against its contract.
extension InvitationSummaryValidation on InvitationSummary {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => InvitationSummarySchema.validate(toJson());
}

/// Validator for [InvitationPage] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class InvitationPageSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value314 = json['items'];
      if (value314 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value314.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i315 = 0; i315 < value314.length; i315++) {
          final item316 = value314[i315];
          InvitationSummarySchema.check(
            item316,
            joinPath(joinPath(path, 'items'), '$i315'),
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
      final value317 = json['nextCursor'];
      if (value317 != null) {
        if (value317 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value317.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value317.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value317)) {
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

/// Validation of [InvitationPage] against its contract.
extension InvitationPageValidation on InvitationPage {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => InvitationPageSchema.validate(toJson());
}

/// Validator for [InviteUserRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class InviteUserRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value318 = json['email'];
      if (value318 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'email'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value318.length > 254) {
          addFieldError(
            errors,
            joinPath(path, 'email'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern4.hasMatch(value318)) {
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
      final value319 = json['groupIds'];
      if (value319 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groupIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value319.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'groupIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i320 = 0; i320 < value319.length; i320++) {
          final item321 = value319[i320];
          if (item321 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groupIds'), '$i320'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item321)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groupIds'), '$i320'),
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

/// Validation of [InviteUserRequest] against its contract.
extension InviteUserRequestValidation on InviteUserRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => InviteUserRequestSchema.validate(toJson());
}

/// Validator for [RevokeInvitationRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class RevokeInvitationRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value322 = json['invitationId'];
      if (value322 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invitationId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value322)) {
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

/// Validation of [RevokeInvitationRequest] against its contract.
extension RevokeInvitationRequestValidation on RevokeInvitationRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      RevokeInvitationRequestSchema.validate(toJson());
}

/// Validator for [AcceptInvitationRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class AcceptInvitationRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value323 = json['token'];
      if (value323 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'token'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value323.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'token'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value323.length > 512) {
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

/// Validation of [AcceptInvitationRequest] against its contract.
extension AcceptInvitationRequestValidation on AcceptInvitationRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      AcceptInvitationRequestSchema.validate(toJson());
}

/// Validator for [ServiceAccountSummary] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ServiceAccountSummarySchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value324 = json['id'];
      if (value324 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value324)) {
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
      final value325 = json['name'];
      if (value325 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value325.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value325.length > 120) {
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
      final value326 = json['permissions'];
      if (value326 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value326.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i327 = 0; i327 < value326.length; i327++) {
          final item328 = value326[i327];
          if (item328 is! String ||
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
                  }.contains(item328))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i327'),
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
      final value329 = json['status'];
      if (value329 is! String ||
          !const <String>{'active', 'disabled'}.contains(value329)) {
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
      final value330 = json['pinnedApiVersion'];
      if (value330 != null) {
        if (value330 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'pinnedApiVersion'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value330.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'pinnedApiVersion'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value330.length > 16) {
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
      final value331 = json['createdAt'];
      if (value331 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value331)) {
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

/// Validation of [ServiceAccountSummary] against its contract.
extension ServiceAccountSummaryValidation on ServiceAccountSummary {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ServiceAccountSummarySchema.validate(toJson());
}

/// Validator for [ServiceAccountPage] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ServiceAccountPageSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value332 = json['items'];
      if (value332 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value332.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i333 = 0; i333 < value332.length; i333++) {
          final item334 = value332[i333];
          ServiceAccountSummarySchema.check(
            item334,
            joinPath(joinPath(path, 'items'), '$i333'),
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
      final value335 = json['nextCursor'];
      if (value335 != null) {
        if (value335 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value335.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value335.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value335)) {
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

/// Validation of [ServiceAccountPage] against its contract.
extension ServiceAccountPageValidation on ServiceAccountPage {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ServiceAccountPageSchema.validate(toJson());
}

/// Validator for [CreateServiceAccountRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class CreateServiceAccountRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
    } else {
      addFieldError(
        errors,
        joinPath(path, 'name'),
        PlatformErrorCode.validationRequired.code,
      );
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
                  }.contains(item339))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i338'),
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
      final value340 = json['pinnedApiVersion'];
      if (value340 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'pinnedApiVersion'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value340.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'pinnedApiVersion'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value340.length > 16) {
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

/// Validation of [CreateServiceAccountRequest] against its contract.
extension CreateServiceAccountRequestValidation on CreateServiceAccountRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      CreateServiceAccountRequestSchema.validate(toJson());
}

/// Validator for [UpdateServiceAccountRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UpdateServiceAccountRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value341 = json['serviceAccountId'];
      if (value341 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value341)) {
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
      final value342 = json['name'];
      if (value342 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value342.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value342.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('permissions')) {
      final value343 = json['permissions'];
      if (value343 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value343.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i344 = 0; i344 < value343.length; i344++) {
          final item345 = value343[i344];
          if (item345 is! String ||
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
                  }.contains(item345))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i344'),
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

/// Validation of [UpdateServiceAccountRequest] against its contract.
extension UpdateServiceAccountRequestValidation on UpdateServiceAccountRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      UpdateServiceAccountRequestSchema.validate(toJson());
}

/// Validator for [DeleteServiceAccountRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class DeleteServiceAccountRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value346 = json['serviceAccountId'];
      if (value346 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value346)) {
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

/// Validation of [DeleteServiceAccountRequest] against its contract.
extension DeleteServiceAccountRequestValidation on DeleteServiceAccountRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      DeleteServiceAccountRequestSchema.validate(toJson());
}

/// Validator for [ApiKeySummary] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ApiKeySummarySchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value347 = json['id'];
      if (value347 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value347)) {
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
      final value348 = json['serviceAccountId'];
      if (value348 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value348)) {
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
      final value349 = json['prefix'];
      if (value349 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'prefix'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value349.length < 12) {
          addFieldError(
            errors,
            joinPath(path, 'prefix'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value349.length > 12) {
          addFieldError(
            errors,
            joinPath(path, 'prefix'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern11.hasMatch(value349)) {
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
      final value350 = json['environment'];
      if (value350 is! String ||
          !const <String>{'live', 'test'}.contains(value350)) {
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
      final value351 = json['status'];
      if (value351 is! String ||
          !const <String>{'active', 'rotated', 'revoked'}.contains(value351)) {
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
      final value352 = json['expiresAt'];
      if (value352 != null) {
        if (value352 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'expiresAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern2.hasMatch(value352)) {
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
      final value353 = json['validUntil'];
      if (value353 != null) {
        if (value353 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'validUntil'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern2.hasMatch(value353)) {
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
      final value354 = json['allowedCidrs'];
      if (value354 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'allowedCidrs'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value354.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'allowedCidrs'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i355 = 0; i355 < value354.length; i355++) {
          final item356 = value354[i355];
          if (item356 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'allowedCidrs'), '$i355'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item356.isEmpty) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'allowedCidrs'), '$i355'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item356.length > 64) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'allowedCidrs'), '$i355'),
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
      final value357 = json['lastUsedAt'];
      if (value357 != null) {
        if (value357 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'lastUsedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern2.hasMatch(value357)) {
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
      final value358 = json['createdAt'];
      if (value358 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value358)) {
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

/// Validation of [ApiKeySummary] against its contract.
extension ApiKeySummaryValidation on ApiKeySummary {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ApiKeySummarySchema.validate(toJson());
}

/// Validator for [ApiKeyPage] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ApiKeyPageSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value359 = json['items'];
      if (value359 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value359.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i360 = 0; i360 < value359.length; i360++) {
          final item361 = value359[i360];
          ApiKeySummarySchema.check(
            item361,
            joinPath(joinPath(path, 'items'), '$i360'),
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
      final value362 = json['nextCursor'];
      if (value362 != null) {
        if (value362 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value362.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value362.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value362)) {
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

/// Validation of [ApiKeyPage] against its contract.
extension ApiKeyPageValidation on ApiKeyPage {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ApiKeyPageSchema.validate(toJson());
}

/// Validator for [ListApiKeysRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ListApiKeysRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value363 = json['serviceAccountId'];
      if (value363 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value363)) {
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
      final value364 = json['limit'];
      if (value364 is! num ||
          !value364.isFinite ||
          value364 != value364.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'limit'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value364 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value364 > 100) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    }
    if (json.containsKey('after')) {
      final value365 = json['after'];
      if (value365 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'after'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value365.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value365.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value365)) {
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

/// Validation of [ListApiKeysRequest] against its contract.
extension ListApiKeysRequestValidation on ListApiKeysRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ListApiKeysRequestSchema.validate(toJson());
}

/// Validator for [CreateApiKeyRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class CreateApiKeyRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value366 = json['serviceAccountId'];
      if (value366 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value366)) {
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
      final value367 = json['environment'];
      if (value367 is! String ||
          !const <String>{'live', 'test'}.contains(value367)) {
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
      final value368 = json['expiresAt'];
      if (value368 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'expiresAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value368)) {
          addFieldError(
            errors,
            joinPath(path, 'expiresAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    if (json.containsKey('allowedCidrs')) {
      final value369 = json['allowedCidrs'];
      if (value369 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'allowedCidrs'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value369.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'allowedCidrs'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i370 = 0; i370 < value369.length; i370++) {
          final item371 = value369[i370];
          if (item371 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'allowedCidrs'), '$i370'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item371.isEmpty) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'allowedCidrs'), '$i370'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item371.length > 64) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'allowedCidrs'), '$i370'),
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

/// Validation of [CreateApiKeyRequest] against its contract.
extension CreateApiKeyRequestValidation on CreateApiKeyRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => CreateApiKeyRequestSchema.validate(toJson());
}

/// Validator for [CreatedApiKey] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class CreatedApiKeySchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      ApiKeySummarySchema.check(
        value372,
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
      final value373 = json['secret'];
      if (value373 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'secret'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value373.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'secret'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value373.length > 128) {
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

/// Validation of [CreatedApiKey] against its contract.
extension CreatedApiKeyValidation on CreatedApiKey {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => CreatedApiKeySchema.validate(toJson());
}

/// Validator for [RotateApiKeyRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class RotateApiKeyRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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

/// Validation of [RotateApiKeyRequest] against its contract.
extension RotateApiKeyRequestValidation on RotateApiKeyRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => RotateApiKeyRequestSchema.validate(toJson());
}

/// Validator for [RevokeApiKeyRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class RevokeApiKeyRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value375 = json['apiKeyId'];
      if (value375 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value375)) {
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

/// Validation of [RevokeApiKeyRequest] against its contract.
extension RevokeApiKeyRequestValidation on RevokeApiKeyRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => RevokeApiKeyRequestSchema.validate(toJson());
}

/// Validator for [AuthenticateApiKeyInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class AuthenticateApiKeyInputSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value376 = json['apiKey'];
      if (value376 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKey'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value376.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'apiKey'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value376.length > 256) {
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
      final value377 = json['clientIp'];
      if (value377 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'clientIp'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value377.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'clientIp'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value377.length > 64) {
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

/// Validation of [AuthenticateApiKeyInput] against its contract.
extension AuthenticateApiKeyInputValidation on AuthenticateApiKeyInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      AuthenticateApiKeyInputSchema.validate(toJson());
}

/// Validator for [ApiKeyPrincipal] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ApiKeyPrincipalSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value378 = json['apiKeyId'];
      if (value378 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value378)) {
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
      final value379 = json['serviceAccountId'];
      if (value379 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value379)) {
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
      final value380 = json['tenantId'];
      if (value380 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value380)) {
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
      final value381 = json['permissions'];
      if (value381 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'permissions'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value381.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'permissions'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i382 = 0; i382 < value381.length; i382++) {
          final item383 = value381[i382];
          if (item383 is! String ||
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
                  }.contains(item383))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'permissions'), '$i382'),
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
      final value384 = json['environment'];
      if (value384 is! String ||
          !const <String>{'live', 'test'}.contains(value384)) {
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
      final value385 = json['expiresAt'];
      if (value385 != null) {
        if (value385 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'expiresAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern2.hasMatch(value385)) {
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
      final value386 = json['pinnedApiVersion'];
      if (value386 != null) {
        if (value386 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'pinnedApiVersion'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value386.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'pinnedApiVersion'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value386.length > 16) {
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

/// Validation of [ApiKeyPrincipal] against its contract.
extension ApiKeyPrincipalValidation on ApiKeyPrincipal {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ApiKeyPrincipalSchema.validate(toJson());
}

/// Validator for [Jwk] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class JwkSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value387 = json['kty'];
      if (value387 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'kty'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value387.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'kty'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value387.length > 256) {
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
      final value388 = json['crv'];
      if (value388 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'crv'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value388.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'crv'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value388.length > 256) {
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
      final value389 = json['kid'];
      if (value389 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'kid'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value389.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'kid'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value389.length > 256) {
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
      final value390 = json['use'];
      if (value390 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'use'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value390.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'use'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value390.length > 256) {
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
      final value391 = json['alg'];
      if (value391 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'alg'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value391.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'alg'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value391.length > 256) {
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
      final value392 = json['x'];
      if (value392 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'x'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value392.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'x'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value392.length > 256) {
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
      final value393 = json['y'];
      if (value393 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'y'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value393.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'y'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value393.length > 256) {
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

/// Validation of [Jwk] against its contract.
extension JwkValidation on Jwk {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => JwkSchema.validate(toJson());
}

/// Validator for [Jwks] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class JwksSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value394 = json['keys'];
      if (value394 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'keys'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value394.length > 10) {
          addFieldError(
            errors,
            joinPath(path, 'keys'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i395 = 0; i395 < value394.length; i395++) {
          final item396 = value394[i395];
          JwkSchema.check(
            item396,
            joinPath(joinPath(path, 'keys'), '$i395'),
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

/// Validation of [Jwks] against its contract.
extension JwksValidation on Jwks {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => JwksSchema.validate(toJson());
}

/// Validator for [UserRegisteredPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UserRegisteredPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
    if (json.containsKey('homeTenantId')) {
      final value398 = json['homeTenantId'];
      if (value398 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'homeTenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value398)) {
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
      final value399 = json['registeredAt'];
      if (value399 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'registeredAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value399)) {
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

/// Validation of [UserRegisteredPayload] against its contract.
extension UserRegisteredPayloadValidation on UserRegisteredPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => UserRegisteredPayloadSchema.validate(toJson());
}

/// Validator for [UserSuspendedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UserSuspendedPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value400 = json['userId'];
      if (value400 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value400)) {
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
      final value401 = json['reason'];
      if (value401 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reason'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value401.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value401.length > 200) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('suspendedAt')) {
      final value402 = json['suspendedAt'];
      if (value402 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'suspendedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value402)) {
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

/// Validation of [UserSuspendedPayload] against its contract.
extension UserSuspendedPayloadValidation on UserSuspendedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => UserSuspendedPayloadSchema.validate(toJson());
}

/// Validator for [UserReactivatedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UserReactivatedPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
    if (json.containsKey('reactivatedAt')) {
      final value404 = json['reactivatedAt'];
      if (value404 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reactivatedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value404)) {
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

/// Validation of [UserReactivatedPayload] against its contract.
extension UserReactivatedPayloadValidation on UserReactivatedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      UserReactivatedPayloadSchema.validate(toJson());
}

/// Validator for [UserEmailChangedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UserEmailChangedPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value405 = json['userId'];
      if (value405 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value405)) {
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
      final value406 = json['changedAt'];
      if (value406 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'changedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value406)) {
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

/// Validation of [UserEmailChangedPayload] against its contract.
extension UserEmailChangedPayloadValidation on UserEmailChangedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      UserEmailChangedPayloadSchema.validate(toJson());
}

/// Validator for [DeviceRegisteredPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class DeviceRegisteredPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value407 = json['userId'];
      if (value407 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value407)) {
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
      final value408 = json['deviceId'];
      if (value408 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value408)) {
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
      final value409 = json['platform'];
      if (value409 is! String ||
          !const <String>{
            'ios',
            'android',
            'web',
            'macos',
            'windows',
            'linux',
          }.contains(value409)) {
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
      final value410 = json['verifier'];
      if (value410 is! bool) {
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
      final value411 = json['registeredAt'];
      if (value411 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'registeredAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value411)) {
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

/// Validation of [DeviceRegisteredPayload] against its contract.
extension DeviceRegisteredPayloadValidation on DeviceRegisteredPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      DeviceRegisteredPayloadSchema.validate(toJson());
}

/// Validator for [DeviceRemovedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class DeviceRemovedPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value412 = json['userId'];
      if (value412 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value412)) {
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
      final value413 = json['deviceId'];
      if (value413 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value413)) {
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
      final value414 = json['removedAt'];
      if (value414 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'removedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value414)) {
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

/// Validation of [DeviceRemovedPayload] against its contract.
extension DeviceRemovedPayloadValidation on DeviceRemovedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => DeviceRemovedPayloadSchema.validate(toJson());
}

/// Validator for [TenantCreatedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantCreatedPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
    if (json.containsKey('slug')) {
      final value416 = json['slug'];
      if (value416 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'slug'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value416.length < 3) {
          addFieldError(
            errors,
            joinPath(path, 'slug'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value416.length > 63) {
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
      final value417 = json['kind'];
      if (value417 is! String ||
          !const <String>{
            'organization',
            'shared_customers',
            'platform',
          }.contains(value417)) {
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
      final value418 = json['region'];
      if (value418 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value418.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value418.length > 32) {
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
      final value419 = json['ownerUserId'];
      if (value419 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'ownerUserId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value419)) {
          addFieldError(
            errors,
            joinPath(path, 'ownerUserId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    if (json.containsKey('createdAt')) {
      final value420 = json['createdAt'];
      if (value420 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value420)) {
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

/// Validation of [TenantCreatedPayload] against its contract.
extension TenantCreatedPayloadValidation on TenantCreatedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => TenantCreatedPayloadSchema.validate(toJson());
}

/// Validator for [TenantSuspendedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantSuspendedPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
    if (json.containsKey('suspendedAt')) {
      final value422 = json['suspendedAt'];
      if (value422 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'suspendedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value422)) {
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

/// Validation of [TenantSuspendedPayload] against its contract.
extension TenantSuspendedPayloadValidation on TenantSuspendedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      TenantSuspendedPayloadSchema.validate(toJson());
}

/// Validator for [TenantReactivatedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantReactivatedPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value423 = json['tenantId'];
      if (value423 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value423)) {
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
      final value424 = json['reactivatedAt'];
      if (value424 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reactivatedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value424)) {
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

/// Validation of [TenantReactivatedPayload] against its contract.
extension TenantReactivatedPayloadValidation on TenantReactivatedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      TenantReactivatedPayloadSchema.validate(toJson());
}

/// Validator for [MembershipChangedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class MembershipChangedPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value425 = json['tenantId'];
      if (value425 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value425)) {
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
      final value426 = json['userId'];
      if (value426 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value426)) {
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
      final value427 = json['kind'];
      if (value427 is! String ||
          !const <String>{
            'added',
            'removed',
            'groups_changed',
          }.contains(value427)) {
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
      final value428 = json['groupIds'];
      if (value428 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groupIds'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value428.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'groupIds'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i429 = 0; i429 < value428.length; i429++) {
          final item430 = value428[i429];
          if (item430 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groupIds'), '$i429'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (!_pattern0.hasMatch(item430)) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groupIds'), '$i429'),
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
      final value431 = json['changedAt'];
      if (value431 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'changedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value431)) {
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

/// Validation of [MembershipChangedPayload] against its contract.
extension MembershipChangedPayloadValidation on MembershipChangedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      MembershipChangedPayloadSchema.validate(toJson());
}

/// Validator for [PermissionsChangedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PermissionsChangedPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
    if (json.containsKey('userId')) {
      final value433 = json['userId'];
      if (value433 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value433)) {
          addFieldError(
            errors,
            joinPath(path, 'userId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    if (json.containsKey('permissionVersion')) {
      final value434 = json['permissionVersion'];
      if (value434 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'permissionVersion'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value434.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'permissionVersion'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern7.hasMatch(value434)) {
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
      final value435 = json['changedAt'];
      if (value435 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'changedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value435)) {
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

/// Validation of [PermissionsChangedPayload] against its contract.
extension PermissionsChangedPayloadValidation on PermissionsChangedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      PermissionsChangedPayloadSchema.validate(toJson());
}

/// Validator for [ApiKeyCreatedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ApiKeyCreatedPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value436 = json['apiKeyId'];
      if (value436 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value436)) {
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
      final value437 = json['serviceAccountId'];
      if (value437 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'serviceAccountId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value437)) {
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
    if (json.containsKey('environment')) {
      final value440 = json['environment'];
      if (value440 is! String ||
          !const <String>{'live', 'test'}.contains(value440)) {
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
      final value441 = json['createdBy'];
      if (value441 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdBy'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value441)) {
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
      final value442 = json['createdAt'];
      if (value442 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value442)) {
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

/// Validation of [ApiKeyCreatedPayload] against its contract.
extension ApiKeyCreatedPayloadValidation on ApiKeyCreatedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ApiKeyCreatedPayloadSchema.validate(toJson());
}

/// Validator for [ApiKeyRevokedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ApiKeyRevokedPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value443 = json['apiKeyId'];
      if (value443 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiKeyId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value443)) {
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
      final value444 = json['tenantId'];
      if (value444 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value444)) {
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
      final value445 = json['prefix'];
      if (value445 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'prefix'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value445.length < 12) {
          addFieldError(
            errors,
            joinPath(path, 'prefix'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value445.length > 12) {
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
      final value446 = json['revokedAt'];
      if (value446 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'revokedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value446)) {
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

/// Validation of [ApiKeyRevokedPayload] against its contract.
extension ApiKeyRevokedPayloadValidation on ApiKeyRevokedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ApiKeyRevokedPayloadSchema.validate(toJson());
}

/// Validator for [SecurityAlertRaisedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SecurityAlertRaisedPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value447 = json['alertId'];
      if (value447 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'alertId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value447)) {
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
      final value448 = json['userId'];
      if (value448 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value448)) {
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
      final value449 = json['type'];
      if (value449 is! String ||
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
          }.contains(value449)) {
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
      final value450 = json['raisedAt'];
      if (value450 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'raisedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value450)) {
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

/// Validation of [SecurityAlertRaisedPayload] against its contract.
extension SecurityAlertRaisedPayloadValidation on SecurityAlertRaisedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      SecurityAlertRaisedPayloadSchema.validate(toJson());
}

/// Validator for [TenantCreation] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantCreationSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value451 = json['tenantId'];
      if (value451 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value451)) {
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
      final value452 = json['sagaId'];
      if (value452 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sagaId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value452)) {
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

/// Validation of [TenantCreation] against its contract.
extension TenantCreationValidation on TenantCreation {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => TenantCreationSchema.validate(toJson());
}

/// Validator for [AccountDeletionStarted] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class AccountDeletionStartedSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value453 = json['sagaId'];
      if (value453 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sagaId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value453)) {
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

/// Validation of [AccountDeletionStarted] against its contract.
extension AccountDeletionStartedValidation on AccountDeletionStarted {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      AccountDeletionStartedSchema.validate(toJson());
}

/// Validator for [GetSagaRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class GetSagaRequestSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value454 = json['sagaId'];
      if (value454 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sagaId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value454)) {
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

/// Validation of [GetSagaRequest] against its contract.
extension GetSagaRequestValidation on GetSagaRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => GetSagaRequestSchema.validate(toJson());
}

/// Validator for [SagaSummary] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SagaSummarySchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value455 = json['sagaId'];
      if (value455 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'sagaId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value455)) {
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
      final value456 = json['saga'];
      if (value456 is! String ||
          !const <String>{
            'identity.tenant-onboarding',
            'identity.delete-account',
            'identity.move-tenant',
          }.contains(value456)) {
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
      final value457 = json['status'];
      if (value457 is! String ||
          !const <String>{
            'running',
            'suspended',
            'compensating',
            'completed',
            'compensated',
            'compensation_failed',
            'requires_intervention',
          }.contains(value457)) {
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
      final value458 = json['startedAt'];
      if (value458 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'startedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value458)) {
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
      final value459 = json['finishedAt'];
      if (value459 != null) {
        if (value459 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'finishedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern2.hasMatch(value459)) {
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

/// Validation of [SagaSummary] against its contract.
extension SagaSummaryValidation on SagaSummary {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => SagaSummarySchema.validate(toJson());
}

/// Validator for [EraseUserInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class EraseUserInputSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value460 = json['userId'];
      if (value460 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value460)) {
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

/// Validation of [EraseUserInput] against its contract.
extension EraseUserInputValidation on EraseUserInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => EraseUserInputSchema.validate(toJson());
}

/// Validator for [EraseUserResult] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class EraseUserResultSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value461 = json['userId'];
      if (value461 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value461)) {
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
      final value462 = json['erasedAt'];
      if (value462 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'erasedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value462)) {
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

/// Validation of [EraseUserResult] against its contract.
extension EraseUserResultValidation on EraseUserResult {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => EraseUserResultSchema.validate(toJson());
}

/// Validator for [ListPushTargetsInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ListPushTargetsInputSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value463 = json['user'];
      UserRefSchema.check(
        value463,
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

/// Validation of [ListPushTargetsInput] against its contract.
extension ListPushTargetsInputValidation on ListPushTargetsInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ListPushTargetsInputSchema.validate(toJson());
}

/// Validator for [PushTarget] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PushTargetSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value464 = json['deviceId'];
      if (value464 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'deviceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value464)) {
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
      final value465 = json['platform'];
      if (value465 is! String ||
          !const <String>{
            'ios',
            'android',
            'web',
            'macos',
            'windows',
            'linux',
          }.contains(value465)) {
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
      final value466 = json['pushToken'];
      if (value466 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'pushToken'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value466.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'pushToken'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value466.length > 512) {
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

/// Validation of [PushTarget] against its contract.
extension PushTargetValidation on PushTarget {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => PushTargetSchema.validate(toJson());
}

/// Validator for [PushTargets] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PushTargetsSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value467 = json['targets'];
      if (value467 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'targets'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value467.length > 50) {
          addFieldError(
            errors,
            joinPath(path, 'targets'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i468 = 0; i468 < value467.length; i468++) {
          final item469 = value467[i468];
          PushTargetSchema.check(
            item469,
            joinPath(joinPath(path, 'targets'), '$i468'),
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

/// Validation of [PushTargets] against its contract.
extension PushTargetsValidation on PushTargets {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => PushTargetsSchema.validate(toJson());
}

/// Validator for [ListMembersByPermissionInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ListMembersByPermissionInputSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value470 = json['tenantId'];
      if (value470 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value470)) {
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
      final value471 = json['permission'];
      if (value471 is! String ||
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
          }.contains(value471)) {
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
      final value472 = json['limit'];
      if (value472 is! num ||
          !value472.isFinite ||
          value472 != value472.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'limit'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value472 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value472 > 100) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    }
    if (json.containsKey('after')) {
      final value473 = json['after'];
      if (value473 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'after'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value473.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value473.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value473)) {
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

/// Validation of [ListMembersByPermissionInput] against its contract.
extension ListMembersByPermissionInputValidation
    on ListMembersByPermissionInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      ListMembersByPermissionInputSchema.validate(toJson());
}

/// Validator for [UserRefPage] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UserRefPageSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value474 = json['items'];
      if (value474 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value474.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i475 = 0; i475 < value474.length; i475++) {
          final item476 = value474[i475];
          UserRefSchema.check(
            item476,
            joinPath(joinPath(path, 'items'), '$i475'),
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
      final value477 = json['nextCursor'];
      if (value477 != null) {
        if (value477 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value477.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value477.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value477)) {
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

/// Validation of [UserRefPage] against its contract.
extension UserRefPageValidation on UserRefPage {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => UserRefPageSchema.validate(toJson());
}

/// Validator for [UserErasedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UserErasedPayloadSchema {
  /// Errors in [json], or an empty list if it matches the contract.
  static List<FieldError> validate(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors);
    return errors;
  }

  /// Errors in [json] received from the server (response or message).
  ///
  /// Like [validate], but accepts enum values this client does not
  /// know inside a list (for example a new permission):
  /// `fromJson` drops them instead of failing.
  static List<FieldError> validateIncoming(Object? json, {String path = ''}) {
    final errors = <FieldError>[];
    check(json, path, errors, acceptUnknownEnums: true);
    return errors;
  }

  /// Adds the errors in [json] under [path] to [errors].
  ///
  /// With [acceptUnknownEnums], an unknown enum value inside
  /// a list is not an error.
  static void check(
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
      final value478 = json['userId'];
      if (value478 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value478)) {
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
      final value479 = json['homeTenantId'];
      if (value479 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'homeTenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value479)) {
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
      final value480 = json['erasedAt'];
      if (value480 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'erasedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value480)) {
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

/// Validation of [UserErasedPayload] against its contract.
extension UserErasedPayloadValidation on UserErasedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => UserErasedPayloadSchema.validate(toJson());
}
