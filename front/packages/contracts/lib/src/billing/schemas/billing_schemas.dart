// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

import '../../billing/types/billing_types.dart';
import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';
import '../../platform/schemas/platform_schemas.dart';

final _pattern0 = RegExp('^\\d{4}-\\d{2}-\\d{2}\$');
final _pattern1 = RegExp(
  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))\$',
);
final _pattern2 = RegExp(
  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})\$',
);
final _pattern3 = RegExp('^[A-Za-z0-9_-]+\$');

/// Validator for [BillingPeriod] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class BillingPeriodSchema {
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
    if (json.containsKey('start')) {
      final value0 = json['start'];
      if (value0 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'start'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value0)) {
          addFieldError(
            errors,
            joinPath(path, 'start'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'start'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('end')) {
      final value1 = json['end'];
      if (value1 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'end'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value1)) {
          addFieldError(
            errors,
            joinPath(path, 'end'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'end'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [BillingPeriod] against its contract.
extension BillingPeriodValidation on BillingPeriod {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => BillingPeriodSchema.validate(toJson());
}

/// Validator for [QuotaLimit] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class QuotaLimitSchema {
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
    if (json.containsKey('metric')) {
      final value2 = json['metric'];
      if (value2 is! String ||
          !const <String>{
            'users',
            'api_calls',
            'storage_gb',
          }.contains(value2)) {
        addFieldError(
          errors,
          joinPath(path, 'metric'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'metric'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('limit')) {
      final value3 = json['limit'];
      if (value3 is! num ||
          !value3.isFinite ||
          value3 != value3.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'limit'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value3 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value3 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'limit'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [QuotaLimit] against its contract.
extension QuotaLimitValidation on QuotaLimit {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => QuotaLimitSchema.validate(toJson());
}

/// Validator for [UsageRecord] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UsageRecordSchema {
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
    if (json.containsKey('metric')) {
      final value4 = json['metric'];
      if (value4 is! String ||
          !const <String>{
            'users',
            'api_calls',
            'storage_gb',
          }.contains(value4)) {
        addFieldError(
          errors,
          joinPath(path, 'metric'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'metric'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('quantity')) {
      final value5 = json['quantity'];
      if (value5 is! num ||
          !value5.isFinite ||
          value5 != value5.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'quantity'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value5 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'quantity'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value5 > 1000000000) {
          addFieldError(
            errors,
            joinPath(path, 'quantity'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'quantity'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('windowStart')) {
      final value6 = json['windowStart'];
      if (value6 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'windowStart'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value6)) {
          addFieldError(
            errors,
            joinPath(path, 'windowStart'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'windowStart'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('key')) {
      final value7 = json['key'];
      if (value7 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'key'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value7.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'key'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value7.length > 200) {
          addFieldError(
            errors,
            joinPath(path, 'key'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'key'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{
        'metric',
        'quantity',
        'windowStart',
        'key',
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

/// Validation of [UsageRecord] against its contract.
extension UsageRecordValidation on UsageRecord {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => UsageRecordSchema.validate(toJson());
}

/// Validator for [RecordUsagePayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class RecordUsagePayloadSchema {
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
      final value8 = json['tenantId'];
      if (value8 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value8)) {
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
    if (json.containsKey('records')) {
      final value9 = json['records'];
      if (value9 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'records'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value9.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'records'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value9.length > 500) {
          addFieldError(
            errors,
            joinPath(path, 'records'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i10 = 0; i10 < value9.length; i10++) {
          final item11 = value9[i10];
          UsageRecordSchema.check(
            item11,
            joinPath(joinPath(path, 'records'), '$i10'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'records'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'tenantId', 'records'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validation of [RecordUsagePayload] against its contract.
extension RecordUsagePayloadValidation on RecordUsagePayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => RecordUsagePayloadSchema.validate(toJson());
}

/// Validator for [SubscriptionChangedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SubscriptionChangedPayloadSchema {
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
      final value12 = json['tenantId'];
      if (value12 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value12)) {
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
    if (json.containsKey('subscriptionId')) {
      final value13 = json['subscriptionId'];
      if (value13 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'subscriptionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value13)) {
          addFieldError(
            errors,
            joinPath(path, 'subscriptionId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'subscriptionId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('previousPlanId')) {
      final value14 = json['previousPlanId'];
      if (value14 != null) {
        if (value14 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'previousPlanId'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern2.hasMatch(value14)) {
            addFieldError(
              errors,
              joinPath(path, 'previousPlanId'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'previousPlanId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('planId')) {
      final value15 = json['planId'];
      if (value15 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'planId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value15)) {
          addFieldError(
            errors,
            joinPath(path, 'planId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'planId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('changedAt')) {
      final value16 = json['changedAt'];
      if (value16 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'changedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value16)) {
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

/// Validation of [SubscriptionChangedPayload] against its contract.
extension SubscriptionChangedPayloadValidation on SubscriptionChangedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      SubscriptionChangedPayloadSchema.validate(toJson());
}

/// Validator for [SubscriptionSuspendedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SubscriptionSuspendedPayloadSchema {
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
      final value17 = json['tenantId'];
      if (value17 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value17)) {
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
    if (json.containsKey('subscriptionId')) {
      final value18 = json['subscriptionId'];
      if (value18 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'subscriptionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value18)) {
          addFieldError(
            errors,
            joinPath(path, 'subscriptionId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'subscriptionId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('suspendedAt')) {
      final value19 = json['suspendedAt'];
      if (value19 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'suspendedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value19)) {
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

/// Validation of [SubscriptionSuspendedPayload] against its contract.
extension SubscriptionSuspendedPayloadValidation
    on SubscriptionSuspendedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      SubscriptionSuspendedPayloadSchema.validate(toJson());
}

/// Validator for [SubscriptionReactivatedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SubscriptionReactivatedPayloadSchema {
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
      final value20 = json['tenantId'];
      if (value20 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value20)) {
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
    if (json.containsKey('subscriptionId')) {
      final value21 = json['subscriptionId'];
      if (value21 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'subscriptionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value21)) {
          addFieldError(
            errors,
            joinPath(path, 'subscriptionId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'subscriptionId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('reactivatedAt')) {
      final value22 = json['reactivatedAt'];
      if (value22 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reactivatedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value22)) {
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

/// Validation of [SubscriptionReactivatedPayload] against its contract.
extension SubscriptionReactivatedPayloadValidation
    on SubscriptionReactivatedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      SubscriptionReactivatedPayloadSchema.validate(toJson());
}

/// Validator for [EntitlementsChangedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class EntitlementsChangedPayloadSchema {
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
      final value23 = json['tenantId'];
      if (value23 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value23)) {
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
    if (json.containsKey('features')) {
      final value24 = json['features'];
      if (value24 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'features'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value24.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'features'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i25 = 0; i25 < value24.length; i25++) {
          final item26 = value24[i25];
          if (item26 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'ai_assistant',
                    'webhooks',
                    'billing',
                    'advanced_reports',
                  }.contains(item26))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'features'), '$i25'),
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
    if (json.containsKey('quotas')) {
      final value27 = json['quotas'];
      if (value27 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'quotas'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value27.length > 10) {
          addFieldError(
            errors,
            joinPath(path, 'quotas'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i28 = 0; i28 < value27.length; i28++) {
          final item29 = value27[i28];
          QuotaLimitSchema.check(
            item29,
            joinPath(joinPath(path, 'quotas'), '$i28'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'quotas'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('changedAt')) {
      final value30 = json['changedAt'];
      if (value30 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'changedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value30)) {
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

/// Validation of [EntitlementsChangedPayload] against its contract.
extension EntitlementsChangedPayloadValidation on EntitlementsChangedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      EntitlementsChangedPayloadSchema.validate(toJson());
}

/// Validator for [InvoiceIssuedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class InvoiceIssuedPayloadSchema {
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
      final value31 = json['tenantId'];
      if (value31 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value31)) {
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
    if (json.containsKey('invoiceId')) {
      final value32 = json['invoiceId'];
      if (value32 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invoiceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value32)) {
          addFieldError(
            errors,
            joinPath(path, 'invoiceId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'invoiceId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('number')) {
      final value33 = json['number'];
      if (value33 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'number'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value33.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'number'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value33.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'number'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'number'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('period')) {
      final value34 = json['period'];
      BillingPeriodSchema.check(
        value34,
        joinPath(path, 'period'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'period'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('total')) {
      final value35 = json['total'];
      MoneyAmountSchema.check(
        value35,
        joinPath(path, 'total'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'total'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('issuedAt')) {
      final value36 = json['issuedAt'];
      if (value36 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'issuedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value36)) {
          addFieldError(
            errors,
            joinPath(path, 'issuedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'issuedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [InvoiceIssuedPayload] against its contract.
extension InvoiceIssuedPayloadValidation on InvoiceIssuedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => InvoiceIssuedPayloadSchema.validate(toJson());
}

/// Validator for [InvoicePaidPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class InvoicePaidPayloadSchema {
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
      final value37 = json['tenantId'];
      if (value37 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value37)) {
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
    if (json.containsKey('invoiceId')) {
      final value38 = json['invoiceId'];
      if (value38 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invoiceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value38)) {
          addFieldError(
            errors,
            joinPath(path, 'invoiceId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'invoiceId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('number')) {
      final value39 = json['number'];
      if (value39 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'number'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value39.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'number'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value39.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'number'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'number'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('total')) {
      final value40 = json['total'];
      MoneyAmountSchema.check(
        value40,
        joinPath(path, 'total'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'total'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('paidAt')) {
      final value41 = json['paidAt'];
      if (value41 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'paidAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value41)) {
          addFieldError(
            errors,
            joinPath(path, 'paidAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'paidAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [InvoicePaidPayload] against its contract.
extension InvoicePaidPayloadValidation on InvoicePaidPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => InvoicePaidPayloadSchema.validate(toJson());
}

/// Validator for [InvoiceFailedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class InvoiceFailedPayloadSchema {
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
      final value42 = json['tenantId'];
      if (value42 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value42)) {
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
    if (json.containsKey('invoiceId')) {
      final value43 = json['invoiceId'];
      if (value43 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invoiceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value43)) {
          addFieldError(
            errors,
            joinPath(path, 'invoiceId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'invoiceId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('number')) {
      final value44 = json['number'];
      if (value44 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'number'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value44.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'number'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value44.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'number'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'number'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('total')) {
      final value45 = json['total'];
      MoneyAmountSchema.check(
        value45,
        joinPath(path, 'total'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'total'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('attempts')) {
      final value46 = json['attempts'];
      if (value46 is! num ||
          !value46.isFinite ||
          value46 != value46.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'attempts'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value46 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'attempts'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value46 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'attempts'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'attempts'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('failedAt')) {
      final value47 = json['failedAt'];
      if (value47 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'failedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value47)) {
          addFieldError(
            errors,
            joinPath(path, 'failedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'failedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [InvoiceFailedPayload] against its contract.
extension InvoiceFailedPayloadValidation on InvoiceFailedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => InvoiceFailedPayloadSchema.validate(toJson());
}

/// Validator for [Plan] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PlanSchema {
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
      final value48 = json['id'];
      if (value48 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value48)) {
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
      final value49 = json['name'];
      if (value49 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'name'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value49.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'name'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value49.length > 120) {
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
    if (json.containsKey('price')) {
      final value50 = json['price'];
      MoneyAmountSchema.check(
        value50,
        joinPath(path, 'price'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'price'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('periodicity')) {
      final value51 = json['periodicity'];
      if (value51 is! String ||
          !const <String>{'monthly', 'annual'}.contains(value51)) {
        addFieldError(
          errors,
          joinPath(path, 'periodicity'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'periodicity'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('quotas')) {
      final value52 = json['quotas'];
      if (value52 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'quotas'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value52.length > 10) {
          addFieldError(
            errors,
            joinPath(path, 'quotas'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i53 = 0; i53 < value52.length; i53++) {
          final item54 = value52[i53];
          QuotaLimitSchema.check(
            item54,
            joinPath(joinPath(path, 'quotas'), '$i53'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'quotas'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('features')) {
      final value55 = json['features'];
      if (value55 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'features'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value55.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'features'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i56 = 0; i56 < value55.length; i56++) {
          final item57 = value55[i56];
          if (item57 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{
                    'ai_assistant',
                    'webhooks',
                    'billing',
                    'advanced_reports',
                  }.contains(item57))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'features'), '$i56'),
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
  }
}

/// Validation of [Plan] against its contract.
extension PlanValidation on Plan {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => PlanSchema.validate(toJson());
}

/// Validator for [PlanCatalog] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class PlanCatalogSchema {
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
      final value58 = json['items'];
      if (value58 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value58.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i59 = 0; i59 < value58.length; i59++) {
          final item60 = value58[i59];
          PlanSchema.check(
            item60,
            joinPath(joinPath(path, 'items'), '$i59'),
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
  }
}

/// Validation of [PlanCatalog] against its contract.
extension PlanCatalogValidation on PlanCatalog {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => PlanCatalogSchema.validate(toJson());
}

/// Validator for [Subscription] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class SubscriptionSchema {
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
      final value61 = json['id'];
      if (value61 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value61)) {
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
    if (json.containsKey('plan')) {
      final value62 = json['plan'];
      PlanSchema.check(
        value62,
        joinPath(path, 'plan'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'plan'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value63 = json['status'];
      if (value63 is! String ||
          !const <String>{
            'trialing',
            'active',
            'past_due',
            'suspended',
            'canceled',
          }.contains(value63)) {
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
    if (json.containsKey('period')) {
      final value64 = json['period'];
      BillingPeriodSchema.check(
        value64,
        joinPath(path, 'period'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'period'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [Subscription] against its contract.
extension SubscriptionValidation on Subscription {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => SubscriptionSchema.validate(toJson());
}

/// Validator for [QuotaUsage] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class QuotaUsageSchema {
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
    if (json.containsKey('metric')) {
      final value65 = json['metric'];
      if (value65 is! String ||
          !const <String>{
            'users',
            'api_calls',
            'storage_gb',
          }.contains(value65)) {
        addFieldError(
          errors,
          joinPath(path, 'metric'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'metric'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('limit')) {
      final value66 = json['limit'];
      if (value66 is! num ||
          !value66.isFinite ||
          value66 != value66.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'limit'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value66 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value66 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'limit'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('used')) {
      final value67 = json['used'];
      if (value67 is! num ||
          !value67.isFinite ||
          value67 != value67.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'used'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value67 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'used'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value67 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'used'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'used'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [QuotaUsage] against its contract.
extension QuotaUsageValidation on QuotaUsage {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => QuotaUsageSchema.validate(toJson());
}

/// Validator for [UsageOverview] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class UsageOverviewSchema {
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
      final value68 = json['items'];
      if (value68 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value68.length > 10) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i69 = 0; i69 < value68.length; i69++) {
          final item70 = value68[i69];
          QuotaUsageSchema.check(
            item70,
            joinPath(joinPath(path, 'items'), '$i69'),
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
  }
}

/// Validation of [UsageOverview] against its contract.
extension UsageOverviewValidation on UsageOverview {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => UsageOverviewSchema.validate(toJson());
}

/// Validator for [InvoiceLine] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class InvoiceLineSchema {
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
    if (json.containsKey('kind')) {
      final value71 = json['kind'];
      if (value71 is! String ||
          !const <String>{'fixed_fee', 'usage'}.contains(value71)) {
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
    if (json.containsKey('description')) {
      final value72 = json['description'];
      if (value72 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'description'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value72.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'description'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value72.length > 200) {
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
    if (json.containsKey('amount')) {
      final value73 = json['amount'];
      MoneyAmountSchema.check(
        value73,
        joinPath(path, 'amount'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'amount'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [InvoiceLine] against its contract.
extension InvoiceLineValidation on InvoiceLine {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => InvoiceLineSchema.validate(toJson());
}

/// Validator for [Invoice] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class InvoiceSchema {
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
      final value74 = json['id'];
      if (value74 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value74)) {
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
    if (json.containsKey('number')) {
      final value75 = json['number'];
      if (value75 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'number'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value75.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'number'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value75.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'number'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'number'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('period')) {
      final value76 = json['period'];
      BillingPeriodSchema.check(
        value76,
        joinPath(path, 'period'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'period'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value77 = json['status'];
      if (value77 is! String ||
          !const <String>{
            'draft',
            'issued',
            'paid',
            'failed',
            'void',
          }.contains(value77)) {
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
    if (json.containsKey('currency')) {
      final value78 = json['currency'];
      if (value78 is! String ||
          !const <String>{'COP', 'USD'}.contains(value78)) {
        addFieldError(
          errors,
          joinPath(path, 'currency'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'currency'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('lines')) {
      final value79 = json['lines'];
      if (value79 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'lines'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value79.length > 200) {
          addFieldError(
            errors,
            joinPath(path, 'lines'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i80 = 0; i80 < value79.length; i80++) {
          final item81 = value79[i80];
          InvoiceLineSchema.check(
            item81,
            joinPath(joinPath(path, 'lines'), '$i80'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'lines'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('total')) {
      final value82 = json['total'];
      MoneyAmountSchema.check(
        value82,
        joinPath(path, 'total'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'total'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [Invoice] against its contract.
extension InvoiceValidation on Invoice {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => InvoiceSchema.validate(toJson());
}

/// Validator for [InvoiceSummary] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class InvoiceSummarySchema {
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
      final value83 = json['id'];
      if (value83 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value83)) {
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
    if (json.containsKey('number')) {
      final value84 = json['number'];
      if (value84 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'number'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value84.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'number'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value84.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'number'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'number'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('period')) {
      final value85 = json['period'];
      BillingPeriodSchema.check(
        value85,
        joinPath(path, 'period'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'period'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value86 = json['status'];
      if (value86 is! String ||
          !const <String>{
            'draft',
            'issued',
            'paid',
            'failed',
            'void',
          }.contains(value86)) {
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
    if (json.containsKey('currency')) {
      final value87 = json['currency'];
      if (value87 is! String ||
          !const <String>{'COP', 'USD'}.contains(value87)) {
        addFieldError(
          errors,
          joinPath(path, 'currency'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'currency'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('total')) {
      final value88 = json['total'];
      MoneyAmountSchema.check(
        value88,
        joinPath(path, 'total'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'total'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [InvoiceSummary] against its contract.
extension InvoiceSummaryValidation on InvoiceSummary {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => InvoiceSummarySchema.validate(toJson());
}

/// Validator for [InvoicePage] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class InvoicePageSchema {
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
      final value89 = json['items'];
      if (value89 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value89.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i90 = 0; i90 < value89.length; i90++) {
          final item91 = value89[i90];
          InvoiceSummarySchema.check(
            item91,
            joinPath(joinPath(path, 'items'), '$i90'),
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
      final value92 = json['nextCursor'];
      if (value92 != null) {
        if (value92 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value92.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value92.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value92)) {
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

/// Validation of [InvoicePage] against its contract.
extension InvoicePageValidation on InvoicePage {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => InvoicePageSchema.validate(toJson());
}

/// Validator for [ChangePlanRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ChangePlanRequestSchema {
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
    if (json.containsKey('planId')) {
      final value93 = json['planId'];
      if (value93 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'planId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value93)) {
          addFieldError(
            errors,
            joinPath(path, 'planId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'planId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'planId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validation of [ChangePlanRequest] against its contract.
extension ChangePlanRequestValidation on ChangePlanRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ChangePlanRequestSchema.validate(toJson());
}

/// Validator for [ListInvoicesRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ListInvoicesRequestSchema {
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
      final value94 = json['status'];
      if (value94 is! String ||
          !const <String>{
            'draft',
            'issued',
            'paid',
            'failed',
            'void',
          }.contains(value94)) {
        addFieldError(
          errors,
          joinPath(path, 'status'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    }
    if (json.containsKey('limit')) {
      final value95 = json['limit'];
      if (value95 is! num ||
          !value95.isFinite ||
          value95 != value95.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'limit'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value95 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value95 > 100) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    }
    if (json.containsKey('after')) {
      final value96 = json['after'];
      if (value96 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'after'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value96.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value96.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value96)) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'status', 'limit', 'after'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validation of [ListInvoicesRequest] against its contract.
extension ListInvoicesRequestValidation on ListInvoicesRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ListInvoicesRequestSchema.validate(toJson());
}

/// Validator for [GetInvoiceRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class GetInvoiceRequestSchema {
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
    if (json.containsKey('invoiceId')) {
      final value97 = json['invoiceId'];
      if (value97 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invoiceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value97)) {
          addFieldError(
            errors,
            joinPath(path, 'invoiceId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'invoiceId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'invoiceId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validation of [GetInvoiceRequest] against its contract.
extension GetInvoiceRequestValidation on GetInvoiceRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => GetInvoiceRequestSchema.validate(toJson());
}

/// Validator for [OpenBillingAccountInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class OpenBillingAccountInputSchema {
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
      final value98 = json['tenantId'];
      if (value98 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value98)) {
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
    if (json.containsKey('ownerUserId')) {
      final value99 = json['ownerUserId'];
      if (value99 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'ownerUserId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value99)) {
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
      if (!const <String>{'tenantId', 'ownerUserId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validation of [OpenBillingAccountInput] against its contract.
extension OpenBillingAccountInputValidation on OpenBillingAccountInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      OpenBillingAccountInputSchema.validate(toJson());
}

/// Validator for [BillingAccountResult] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class BillingAccountResultSchema {
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
      final value100 = json['tenantId'];
      if (value100 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value100)) {
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
    if (json.containsKey('subscriptionId')) {
      final value101 = json['subscriptionId'];
      if (value101 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'subscriptionId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value101)) {
          addFieldError(
            errors,
            joinPath(path, 'subscriptionId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'subscriptionId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value102 = json['status'];
      if (value102 is! String ||
          !const <String>{
            'trialing',
            'active',
            'past_due',
            'suspended',
            'canceled',
          }.contains(value102)) {
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

/// Validation of [BillingAccountResult] against its contract.
extension BillingAccountResultValidation on BillingAccountResult {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => BillingAccountResultSchema.validate(toJson());
}

/// Validator for [CloseBillingAccountInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class CloseBillingAccountInputSchema {
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
      final value103 = json['tenantId'];
      if (value103 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value103)) {
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

/// Validation of [CloseBillingAccountInput] against its contract.
extension CloseBillingAccountInputValidation on CloseBillingAccountInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      CloseBillingAccountInputSchema.validate(toJson());
}

/// Validator for [BillingAccountClosed] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class BillingAccountClosedSchema {
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
      final value104 = json['tenantId'];
      if (value104 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value104)) {
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

/// Validation of [BillingAccountClosed] against its contract.
extension BillingAccountClosedValidation on BillingAccountClosed {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => BillingAccountClosedSchema.validate(toJson());
}

/// Validator for [GetEntitlementsInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class GetEntitlementsInputSchema {
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
      final value105 = json['tenantId'];
      if (value105 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value105)) {
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

/// Validation of [GetEntitlementsInput] against its contract.
extension GetEntitlementsInputValidation on GetEntitlementsInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => GetEntitlementsInputSchema.validate(toJson());
}

/// Validator for [Entitlements] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class EntitlementsSchema {
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
      final value106 = json['tenantId'];
      if (value106 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value106)) {
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
      final value107 = json['status'];
      if (value107 is! String ||
          !const <String>{
            'trialing',
            'active',
            'past_due',
            'suspended',
            'canceled',
          }.contains(value107)) {
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
    if (json.containsKey('features')) {
      final value108 = json['features'];
      if (value108 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'features'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value108.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'features'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
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
    if (json.containsKey('quotas')) {
      final value111 = json['quotas'];
      if (value111 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'quotas'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value111.length > 10) {
          addFieldError(
            errors,
            joinPath(path, 'quotas'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i112 = 0; i112 < value111.length; i112++) {
          final item113 = value111[i112];
          QuotaLimitSchema.check(
            item113,
            joinPath(joinPath(path, 'quotas'), '$i112'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'quotas'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [Entitlements] against its contract.
extension EntitlementsValidation on Entitlements {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => EntitlementsSchema.validate(toJson());
}

/// Validator for [CheckQuotaInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class CheckQuotaInputSchema {
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
      final value114 = json['tenantId'];
      if (value114 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value114)) {
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
    if (json.containsKey('metric')) {
      final value115 = json['metric'];
      if (value115 is! String ||
          !const <String>{
            'users',
            'api_calls',
            'storage_gb',
          }.contains(value115)) {
        addFieldError(
          errors,
          joinPath(path, 'metric'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'metric'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('requested')) {
      final value116 = json['requested'];
      if (value116 is! num ||
          !value116.isFinite ||
          value116 != value116.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'requested'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value116 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'requested'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value116 > 1000000000) {
          addFieldError(
            errors,
            joinPath(path, 'requested'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'tenantId', 'metric', 'requested'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validation of [CheckQuotaInput] against its contract.
extension CheckQuotaInputValidation on CheckQuotaInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => CheckQuotaInputSchema.validate(toJson());
}

/// Validator for [QuotaCheck] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class QuotaCheckSchema {
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
    if (json.containsKey('metric')) {
      final value117 = json['metric'];
      if (value117 is! String ||
          !const <String>{
            'users',
            'api_calls',
            'storage_gb',
          }.contains(value117)) {
        addFieldError(
          errors,
          joinPath(path, 'metric'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'metric'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('limit')) {
      final value118 = json['limit'];
      if (value118 is! num ||
          !value118.isFinite ||
          value118 != value118.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'limit'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value118 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value118 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'limit'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('used')) {
      final value119 = json['used'];
      if (value119 is! num ||
          !value119.isFinite ||
          value119 != value119.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'used'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value119 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'used'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value119 > 9007199254740991) {
          addFieldError(
            errors,
            joinPath(path, 'used'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'used'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('allowed')) {
      final value120 = json['allowed'];
      if (value120 is! bool) {
        addFieldError(
          errors,
          joinPath(path, 'allowed'),
          PlatformErrorCode.validationInvalidType.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'allowed'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [QuotaCheck] against its contract.
extension QuotaCheckValidation on QuotaCheck {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => QuotaCheckSchema.validate(toJson());
}

/// Validator for [MarkInvoicePaidInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class MarkInvoicePaidInputSchema {
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
      final value121 = json['tenantId'];
      if (value121 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value121)) {
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
    if (json.containsKey('invoiceId')) {
      final value122 = json['invoiceId'];
      if (value122 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invoiceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value122)) {
          addFieldError(
            errors,
            joinPath(path, 'invoiceId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'invoiceId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('paidAt')) {
      final value123 = json['paidAt'];
      if (value123 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'paidAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value123)) {
          addFieldError(
            errors,
            joinPath(path, 'paidAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'paidAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('reference')) {
      final value124 = json['reference'];
      if (value124 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reference'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value124.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'reference'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value124.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'reference'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'reference'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('amount')) {
      final value125 = json['amount'];
      MoneyAmountSchema.check(
        value125,
        joinPath(path, 'amount'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'amount'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('attemptId')) {
      final value126 = json['attemptId'];
      if (value126 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'attemptId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value126)) {
          addFieldError(
            errors,
            joinPath(path, 'attemptId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{
        'tenantId',
        'invoiceId',
        'paidAt',
        'reference',
        'amount',
        'attemptId',
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

/// Validation of [MarkInvoicePaidInput] against its contract.
extension MarkInvoicePaidInputValidation on MarkInvoicePaidInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => MarkInvoicePaidInputSchema.validate(toJson());
}

/// Validator for [MarkInvoiceFailedInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class MarkInvoiceFailedInputSchema {
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
      final value127 = json['tenantId'];
      if (value127 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value127)) {
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
    if (json.containsKey('invoiceId')) {
      final value128 = json['invoiceId'];
      if (value128 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invoiceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value128)) {
          addFieldError(
            errors,
            joinPath(path, 'invoiceId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'invoiceId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('failedAt')) {
      final value129 = json['failedAt'];
      if (value129 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'failedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value129)) {
          addFieldError(
            errors,
            joinPath(path, 'failedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'failedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('reason')) {
      final value130 = json['reason'];
      if (value130 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'reason'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value130.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value130.length > 200) {
          addFieldError(
            errors,
            joinPath(path, 'reason'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    }
    if (json.containsKey('attemptId')) {
      final value131 = json['attemptId'];
      if (value131 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'attemptId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value131)) {
          addFieldError(
            errors,
            joinPath(path, 'attemptId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{
        'tenantId',
        'invoiceId',
        'failedAt',
        'reason',
        'attemptId',
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

/// Validation of [MarkInvoiceFailedInput] against its contract.
extension MarkInvoiceFailedInputValidation on MarkInvoiceFailedInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      MarkInvoiceFailedInputSchema.validate(toJson());
}

/// Validator for [InvoiceStateResult] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class InvoiceStateResultSchema {
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
    if (json.containsKey('invoiceId')) {
      final value132 = json['invoiceId'];
      if (value132 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'invoiceId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value132)) {
          addFieldError(
            errors,
            joinPath(path, 'invoiceId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'invoiceId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value133 = json['status'];
      if (value133 is! String ||
          !const <String>{
            'draft',
            'issued',
            'paid',
            'failed',
            'void',
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
  }
}

/// Validation of [InvoiceStateResult] against its contract.
extension InvoiceStateResultValidation on InvoiceStateResult {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => InvoiceStateResultSchema.validate(toJson());
}

/// Validator for [InvoiceChange] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class InvoiceChangeSchema {
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
        if (!_pattern2.hasMatch(value134)) {
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
    if (json.containsKey('number')) {
      final value135 = json['number'];
      if (value135 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'number'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value135.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'number'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value135.length > 32) {
          addFieldError(
            errors,
            joinPath(path, 'number'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'number'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('period')) {
      final value136 = json['period'];
      BillingPeriodSchema.check(
        value136,
        joinPath(path, 'period'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'period'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('status')) {
      final value137 = json['status'];
      if (value137 is! String ||
          !const <String>{
            'draft',
            'issued',
            'paid',
            'failed',
            'void',
          }.contains(value137)) {
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
    if (json.containsKey('currency')) {
      final value138 = json['currency'];
      if (value138 is! String ||
          !const <String>{'COP', 'USD'}.contains(value138)) {
        addFieldError(
          errors,
          joinPath(path, 'currency'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'currency'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('total')) {
      final value139 = json['total'];
      MoneyAmountSchema.check(
        value139,
        joinPath(path, 'total'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'total'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('issuedAt')) {
      final value140 = json['issuedAt'];
      if (value140 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'issuedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value140)) {
          addFieldError(
            errors,
            joinPath(path, 'issuedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'issuedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('paidAt')) {
      final value141 = json['paidAt'];
      if (value141 != null) {
        if (value141 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'paidAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern1.hasMatch(value141)) {
            addFieldError(
              errors,
              joinPath(path, 'paidAt'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'paidAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [InvoiceChange] against its contract.
extension InvoiceChangeValidation on InvoiceChange {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => InvoiceChangeSchema.validate(toJson());
}

/// Validator for [InvoiceChangePage] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class InvoiceChangePageSchema {
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
      final value142 = json['items'];
      if (value142 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value142.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i143 = 0; i143 < value142.length; i143++) {
          final item144 = value142[i143];
          InvoiceChangeSchema.check(
            item144,
            joinPath(joinPath(path, 'items'), '$i143'),
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
      final value145 = json['nextCursor'];
      if (value145 != null) {
        if (value145 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value145.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value145.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value145)) {
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

/// Validation of [InvoiceChangePage] against its contract.
extension InvoiceChangePageValidation on InvoiceChangePage {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => InvoiceChangePageSchema.validate(toJson());
}

/// Validator for [ListInvoiceChangesInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ListInvoiceChangesInputSchema {
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
      final value146 = json['tenantId'];
      if (value146 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value146)) {
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
    if (json.containsKey('limit')) {
      final value147 = json['limit'];
      if (value147 is! num ||
          !value147.isFinite ||
          value147 != value147.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'limit'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value147 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value147 > 100) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    }
    if (json.containsKey('after')) {
      final value148 = json['after'];
      if (value148 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'after'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value148.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value148.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value148)) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'tenantId', 'limit', 'after'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validation of [ListInvoiceChangesInput] against its contract.
extension ListInvoiceChangesInputValidation on ListInvoiceChangesInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      ListInvoiceChangesInputSchema.validate(toJson());
}
