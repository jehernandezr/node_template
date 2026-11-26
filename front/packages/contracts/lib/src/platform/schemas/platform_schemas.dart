// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';
import '../../platform/types/platform_types.dart';

final _pattern0 = RegExp('^[A-Za-z0-9_-]+\$');
final _pattern1 = RegExp('^[A-Z]{3}\$');
final _pattern2 = RegExp(
  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})\$',
);

/// Validator for [PageQuery] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PageQuerySchema {
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

/// Validation of [PageQuery] against its contract.
extension PageQueryValidation on PageQuery {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => PageQuerySchema.validate(toJson());
}

/// Validator for [MoneyAmount] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class MoneyAmountSchema {
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

/// Validation of [MoneyAmount] against its contract.
extension MoneyAmountValidation on MoneyAmount {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => MoneyAmountSchema.validate(toJson());
}

/// Validator for [FieldError] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class FieldErrorSchema {
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

/// Validator for [ProblemDetails] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ProblemDetailsSchema {
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

/// Validator for [Empty] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class EmptySchema {
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

/// Validation of [Empty] against its contract.
extension EmptyValidation on Empty {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => EmptySchema.validate(toJson());
}

/// Validator for [UserRef] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UserRefSchema {
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

/// Validation of [UserRef] against its contract.
extension UserRefValidation on UserRef {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => UserRefSchema.validate(toJson());
}

/// Validator for [TenantMoveRef] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantMoveRefSchema {
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

/// Validation of [TenantMoveRef] against its contract.
extension TenantMoveRefValidation on TenantMoveRef {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => TenantMoveRefSchema.validate(toJson());
}

/// Validator for [TenantMoveTableProgress] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantMoveTableProgressSchema {
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

/// Validation of [TenantMoveTableProgress] against its contract.
extension TenantMoveTableProgressValidation on TenantMoveTableProgress {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      TenantMoveTableProgressSchema.validate(toJson());
}

/// Validator for [TenantMoveProgress] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantMoveProgressSchema {
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

/// Validation of [TenantMoveProgress] against its contract.
extension TenantMoveProgressValidation on TenantMoveProgress {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => TenantMoveProgressSchema.validate(toJson());
}

/// Validator for [TenantMoveTableCheck] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantMoveTableCheckSchema {
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

/// Validation of [TenantMoveTableCheck] against its contract.
extension TenantMoveTableCheckValidation on TenantMoveTableCheck {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => TenantMoveTableCheckSchema.validate(toJson());
}

/// Validator for [TenantMoveVerification] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantMoveVerificationSchema {
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

/// Validation of [TenantMoveVerification] against its contract.
extension TenantMoveVerificationValidation on TenantMoveVerification {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      TenantMoveVerificationSchema.validate(toJson());
}

/// Validator for [TenantMoveAck] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantMoveAckSchema {
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

/// Validation of [TenantMoveAck] against its contract.
extension TenantMoveAckValidation on TenantMoveAck {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => TenantMoveAckSchema.validate(toJson());
}

/// Validator for [TenantDirectoryEntry] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantDirectoryEntrySchema {
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
      final value41 = json['tenantId'];
      if (value41 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value41)) {
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
    if (json.containsKey('region')) {
      final value42 = json['region'];
      if (value42 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value42.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'region'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value42.length > 64) {
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
    if (json.containsKey('groups')) {
      final value43 = json['groups'];
      if (value43 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'groups'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value43.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'groups'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value43.length > 64) {
          addFieldError(
            errors,
            joinPath(path, 'groups'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i44 = 0; i44 < value43.length; i44++) {
          final item45 = value43[i44];
          if (item45 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'groups'), '$i44'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item45.isEmpty) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groups'), '$i44'),
                PlatformErrorCode.validationTooShort.code,
              );
            }
            if (item45.length > 64) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'groups'), '$i44'),
                PlatformErrorCode.validationTooLong.code,
              );
            }
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'groups'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('dedicated')) {
      final value46 = json['dedicated'];
      if (value46 is! bool) {
        addFieldError(
          errors,
          joinPath(path, 'dedicated'),
          PlatformErrorCode.validationInvalidType.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'dedicated'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{
        'tenantId',
        'region',
        'groups',
        'dedicated',
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

/// Validation of [TenantDirectoryEntry] against its contract.
extension TenantDirectoryEntryValidation on TenantDirectoryEntry {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => TenantDirectoryEntrySchema.validate(toJson());
}

/// Validator for [TenantDirectoryRef] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantDirectoryRefSchema {
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

/// Validation of [TenantDirectoryRef] against its contract.
extension TenantDirectoryRefValidation on TenantDirectoryRef {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => TenantDirectoryRefSchema.validate(toJson());
}

/// Validator for [TenantDirectoryAck] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class TenantDirectoryAckSchema {
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
      final value48 = json['tenantId'];
      if (value48 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value48)) {
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
  }
}

/// Validation of [TenantDirectoryAck] against its contract.
extension TenantDirectoryAckValidation on TenantDirectoryAck {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => TenantDirectoryAckSchema.validate(toJson());
}

/// Validator for [ProblemDetailsDetails] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ProblemDetailsDetailsSchema {
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
    if (json.containsKey('apiBaseUrl')) {
      final value49 = json['apiBaseUrl'];
      if (value49 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'apiBaseUrl'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value49.length > 2048) {
          addFieldError(
            errors,
            joinPath(path, 'apiBaseUrl'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('region')) {
      final value50 = json['region'];
      if (value50 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'region'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value50.length > 64) {
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

/// Validation of [ProblemDetailsDetails] against its contract.
extension ProblemDetailsDetailsValidation on ProblemDetailsDetails {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ProblemDetailsDetailsSchema.validate(toJson());
}
