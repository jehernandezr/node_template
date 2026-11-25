// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';
import '../../platform/schemas/platform_schemas.dart';
import '../../reports/types/reports_types.dart';

final _pattern0 = RegExp(
  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})\$',
);
final _pattern1 = RegExp(
  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))\$',
);
final _pattern2 = RegExp('^\\d{4}-\\d{2}-\\d{2}\$');
final _pattern3 = RegExp('^[A-Za-z0-9_-]+\$');

/// Validator for [RunCompletedPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class RunCompletedPayloadSchema {
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
      final value0 = json['tenantId'];
      if (value0 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value0)) {
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
    if (json.containsKey('runId')) {
      final value1 = json['runId'];
      if (value1 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'runId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value1)) {
          addFieldError(
            errors,
            joinPath(path, 'runId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'runId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('type')) {
      final value2 = json['type'];
      if (value2 is! String ||
          !const <String>{
            'tasks_by_status',
            'tasks_activity',
            'invoices_summary',
            'notifications_delivery',
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
    if (json.containsKey('status')) {
      final value3 = json['status'];
      if (value3 is! String ||
          !const <String>{
            'queued',
            'running',
            'ready',
            'failed',
            'expired',
          }.contains(value3)) {
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
    if (json.containsKey('requestedBy')) {
      final value4 = json['requestedBy'];
      UserRefSchema.check(
        value4,
        joinPath(path, 'requestedBy'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'requestedBy'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('completedAt')) {
      final value5 = json['completedAt'];
      if (value5 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'completedAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value5)) {
          addFieldError(
            errors,
            joinPath(path, 'completedAt'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'completedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [RunCompletedPayload] against its contract.
extension RunCompletedPayloadValidation on RunCompletedPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => RunCompletedPayloadSchema.validate(toJson());
}

/// Validator for [ExecuteRunPayload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ExecuteRunPayloadSchema {
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
      final value6 = json['tenantId'];
      if (value6 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'tenantId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value6)) {
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
    if (json.containsKey('runId')) {
      final value7 = json['runId'];
      if (value7 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'runId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value7)) {
          addFieldError(
            errors,
            joinPath(path, 'runId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'runId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'tenantId', 'runId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validation of [ExecuteRunPayload] against its contract.
extension ExecuteRunPayloadValidation on ExecuteRunPayload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ExecuteRunPayloadSchema.validate(toJson());
}

/// Validator for [ReportParams] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ReportParamsSchema {
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
    if (json.containsKey('from')) {
      final value8 = json['from'];
      if (value8 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'from'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value8)) {
          addFieldError(
            errors,
            joinPath(path, 'from'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'from'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('to')) {
      final value9 = json['to'];
      if (value9 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'to'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern2.hasMatch(value9)) {
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
    if (json.containsKey('granularity')) {
      final value10 = json['granularity'];
      if (value10 is! String ||
          !const <String>{'day', 'week', 'month'}.contains(value10)) {
        addFieldError(
          errors,
          joinPath(path, 'granularity'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'granularity'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'from', 'to', 'granularity'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validation of [ReportParams] against its contract.
extension ReportParamsValidation on ReportParams {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ReportParamsSchema.validate(toJson());
}

/// Validator for [ReportColumn] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ReportColumnSchema {
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
    if (json.containsKey('key')) {
      final value11 = json['key'];
      if (value11 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'key'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value11.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'key'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value11.length > 64) {
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
    if (json.containsKey('header')) {
      final value12 = json['header'];
      if (value12 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'header'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value12.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'header'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value12.length > 120) {
          addFieldError(
            errors,
            joinPath(path, 'header'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'header'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('kind')) {
      final value13 = json['kind'];
      if (value13 is! String ||
          !const <String>{'text', 'integer', 'date'}.contains(value13)) {
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
  }
}

/// Validation of [ReportColumn] against its contract.
extension ReportColumnValidation on ReportColumn {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ReportColumnSchema.validate(toJson());
}

/// Validator for [ReportRow] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ReportRowSchema {
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
    if (json.containsKey('cells')) {
      final value14 = json['cells'];
      if (value14 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'cells'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value14.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'cells'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i15 = 0; i15 < value14.length; i15++) {
          final item16 = value14[i15];
          if (item16 is! String) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'cells'), '$i15'),
              PlatformErrorCode.validationInvalidType.code,
            );
          } else {
            if (item16.length > 1000) {
              addFieldError(
                errors,
                joinPath(joinPath(path, 'cells'), '$i15'),
                PlatformErrorCode.validationTooLong.code,
              );
            }
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'cells'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [ReportRow] against its contract.
extension ReportRowValidation on ReportRow {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ReportRowSchema.validate(toJson());
}

/// Validator for [ReportResult] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ReportResultSchema {
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
    if (json.containsKey('columns')) {
      final value17 = json['columns'];
      if (value17 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'columns'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value17.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'columns'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i18 = 0; i18 < value17.length; i18++) {
          final item19 = value17[i18];
          ReportColumnSchema.check(
            item19,
            joinPath(joinPath(path, 'columns'), '$i18'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'columns'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('rows')) {
      final value20 = json['rows'];
      if (value20 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'rows'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value20.length > 10000) {
          addFieldError(
            errors,
            joinPath(path, 'rows'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i21 = 0; i21 < value20.length; i21++) {
          final item22 = value20[i21];
          ReportRowSchema.check(
            item22,
            joinPath(joinPath(path, 'rows'), '$i21'),
            errors,
            acceptUnknownEnums: acceptUnknownEnums,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'rows'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [ReportResult] against its contract.
extension ReportResultValidation on ReportResult {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ReportResultSchema.validate(toJson());
}

/// Validator for [ReportCatalogEntry] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ReportCatalogEntrySchema {
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
      final value23 = json['type'];
      if (value23 is! String ||
          !const <String>{
            'tasks_by_status',
            'tasks_activity',
            'invoices_summary',
            'notifications_delivery',
          }.contains(value23)) {
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
    if (json.containsKey('formats')) {
      final value24 = json['formats'];
      if (value24 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'formats'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value24.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'formats'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value24.length > 2) {
          addFieldError(
            errors,
            joinPath(path, 'formats'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i25 = 0; i25 < value24.length; i25++) {
          final item26 = value24[i25];
          if (item26 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{'json', 'csv'}.contains(item26))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'formats'), '$i25'),
              PlatformErrorCode.validationInvalidEnum.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'formats'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('granularities')) {
      final value27 = json['granularities'];
      if (value27 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'granularities'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value27.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'granularities'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value27.length > 3) {
          addFieldError(
            errors,
            joinPath(path, 'granularities'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i28 = 0; i28 < value27.length; i28++) {
          final item29 = value27[i28];
          if (item29 is! String ||
              (!acceptUnknownEnums &&
                  !const <String>{'day', 'week', 'month'}.contains(item29))) {
            addFieldError(
              errors,
              joinPath(joinPath(path, 'granularities'), '$i28'),
              PlatformErrorCode.validationInvalidEnum.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'granularities'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [ReportCatalogEntry] against its contract.
extension ReportCatalogEntryValidation on ReportCatalogEntry {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ReportCatalogEntrySchema.validate(toJson());
}

/// Validator for [ReportCatalog] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ReportCatalogSchema {
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
      final value30 = json['items'];
      if (value30 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value30.length > 20) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i31 = 0; i31 < value30.length; i31++) {
          final item32 = value30[i31];
          ReportCatalogEntrySchema.check(
            item32,
            joinPath(joinPath(path, 'items'), '$i31'),
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

/// Validation of [ReportCatalog] against its contract.
extension ReportCatalogValidation on ReportCatalog {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ReportCatalogSchema.validate(toJson());
}

/// Validator for [CreateReportRunRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class CreateReportRunRequestSchema {
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
      final value33 = json['type'];
      if (value33 is! String ||
          !const <String>{
            'tasks_by_status',
            'tasks_activity',
            'invoices_summary',
            'notifications_delivery',
          }.contains(value33)) {
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
    if (json.containsKey('format')) {
      final value34 = json['format'];
      if (value34 is! String ||
          !const <String>{'json', 'csv'}.contains(value34)) {
        addFieldError(
          errors,
          joinPath(path, 'format'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'format'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('params')) {
      final value35 = json['params'];
      ReportParamsSchema.check(
        value35,
        joinPath(path, 'params'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'params'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'type', 'format', 'params'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validation of [CreateReportRunRequest] against its contract.
extension CreateReportRunRequestValidation on CreateReportRunRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      CreateReportRunRequestSchema.validate(toJson());
}

/// Validator for [ReportRunCreated] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ReportRunCreatedSchema {
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
    if (json.containsKey('runId')) {
      final value36 = json['runId'];
      if (value36 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'runId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value36)) {
          addFieldError(
            errors,
            joinPath(path, 'runId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'runId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [ReportRunCreated] against its contract.
extension ReportRunCreatedValidation on ReportRunCreated {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ReportRunCreatedSchema.validate(toJson());
}

/// Validator for [ReportRunSummary] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ReportRunSummarySchema {
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
      final value37 = json['id'];
      if (value37 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value37)) {
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
      final value38 = json['type'];
      if (value38 is! String ||
          !const <String>{
            'tasks_by_status',
            'tasks_activity',
            'invoices_summary',
            'notifications_delivery',
          }.contains(value38)) {
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
    if (json.containsKey('status')) {
      final value39 = json['status'];
      if (value39 is! String ||
          !const <String>{
            'queued',
            'running',
            'ready',
            'failed',
            'expired',
          }.contains(value39)) {
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
    if (json.containsKey('format')) {
      final value40 = json['format'];
      if (value40 is! String ||
          !const <String>{'json', 'csv'}.contains(value40)) {
        addFieldError(
          errors,
          joinPath(path, 'format'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'format'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('params')) {
      final value41 = json['params'];
      ReportParamsSchema.check(
        value41,
        joinPath(path, 'params'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'params'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('requestedBy')) {
      final value42 = json['requestedBy'];
      UserRefSchema.check(
        value42,
        joinPath(path, 'requestedBy'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'requestedBy'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdAt')) {
      final value43 = json['createdAt'];
      if (value43 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value43)) {
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
    if (json.containsKey('completedAt')) {
      final value44 = json['completedAt'];
      if (value44 != null) {
        if (value44 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'completedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern1.hasMatch(value44)) {
            addFieldError(
              errors,
              joinPath(path, 'completedAt'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'completedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('expiresAt')) {
      final value45 = json['expiresAt'];
      if (value45 != null) {
        if (value45 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'expiresAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern1.hasMatch(value45)) {
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
  }
}

/// Validation of [ReportRunSummary] against its contract.
extension ReportRunSummaryValidation on ReportRunSummary {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ReportRunSummarySchema.validate(toJson());
}

/// Validator for [ReportRunPage] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ReportRunPageSchema {
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
      final value46 = json['items'];
      if (value46 is! List) {
        addFieldError(
          errors,
          joinPath(path, 'items'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value46.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'items'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        for (var i47 = 0; i47 < value46.length; i47++) {
          final item48 = value46[i47];
          ReportRunSummarySchema.check(
            item48,
            joinPath(joinPath(path, 'items'), '$i47'),
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
      final value49 = json['nextCursor'];
      if (value49 != null) {
        if (value49 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'nextCursor'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (value49.isEmpty) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooShort.code,
            );
          }
          if (value49.length > 512) {
            addFieldError(
              errors,
              joinPath(path, 'nextCursor'),
              PlatformErrorCode.validationTooLong.code,
            );
          }
          if (!_pattern3.hasMatch(value49)) {
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

/// Validation of [ReportRunPage] against its contract.
extension ReportRunPageValidation on ReportRunPage {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ReportRunPageSchema.validate(toJson());
}

/// Validator for [ListReportRunsRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ListReportRunsRequestSchema {
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
      final value50 = json['type'];
      if (value50 is! String ||
          !const <String>{
            'tasks_by_status',
            'tasks_activity',
            'invoices_summary',
            'notifications_delivery',
          }.contains(value50)) {
        addFieldError(
          errors,
          joinPath(path, 'type'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    }
    if (json.containsKey('status')) {
      final value51 = json['status'];
      if (value51 is! String ||
          !const <String>{
            'queued',
            'running',
            'ready',
            'failed',
            'expired',
          }.contains(value51)) {
        addFieldError(
          errors,
          joinPath(path, 'status'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    }
    if (json.containsKey('limit')) {
      final value52 = json['limit'];
      if (value52 is! num ||
          !value52.isFinite ||
          value52 != value52.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'limit'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value52 < 1) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value52 > 100) {
          addFieldError(
            errors,
            joinPath(path, 'limit'),
            PlatformErrorCode.validationTooLarge.code,
          );
        }
      }
    }
    if (json.containsKey('after')) {
      final value53 = json['after'];
      if (value53 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'after'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value53.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value53.length > 512) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
        if (!_pattern3.hasMatch(value53)) {
          addFieldError(
            errors,
            joinPath(path, 'after'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    }
    for (final key in json.keys) {
      if (!const <String>{'type', 'status', 'limit', 'after'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validation of [ListReportRunsRequest] against its contract.
extension ListReportRunsRequestValidation on ListReportRunsRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ListReportRunsRequestSchema.validate(toJson());
}

/// Validator for [GetReportRunRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class GetReportRunRequestSchema {
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
    if (json.containsKey('runId')) {
      final value54 = json['runId'];
      if (value54 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'runId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value54)) {
          addFieldError(
            errors,
            joinPath(path, 'runId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'runId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'runId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validation of [GetReportRunRequest] against its contract.
extension GetReportRunRequestValidation on GetReportRunRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => GetReportRunRequestSchema.validate(toJson());
}

/// Validator for [ReportRunDetail] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ReportRunDetailSchema {
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
      final value55 = json['id'];
      if (value55 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'id'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value55)) {
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
      final value56 = json['type'];
      if (value56 is! String ||
          !const <String>{
            'tasks_by_status',
            'tasks_activity',
            'invoices_summary',
            'notifications_delivery',
          }.contains(value56)) {
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
    if (json.containsKey('status')) {
      final value57 = json['status'];
      if (value57 is! String ||
          !const <String>{
            'queued',
            'running',
            'ready',
            'failed',
            'expired',
          }.contains(value57)) {
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
    if (json.containsKey('format')) {
      final value58 = json['format'];
      if (value58 is! String ||
          !const <String>{'json', 'csv'}.contains(value58)) {
        addFieldError(
          errors,
          joinPath(path, 'format'),
          PlatformErrorCode.validationInvalidEnum.code,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'format'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('params')) {
      final value59 = json['params'];
      ReportParamsSchema.check(
        value59,
        joinPath(path, 'params'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'params'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('requestedBy')) {
      final value60 = json['requestedBy'];
      UserRefSchema.check(
        value60,
        joinPath(path, 'requestedBy'),
        errors,
        acceptUnknownEnums: acceptUnknownEnums,
      );
    } else {
      addFieldError(
        errors,
        joinPath(path, 'requestedBy'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('createdAt')) {
      final value61 = json['createdAt'];
      if (value61 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'createdAt'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern1.hasMatch(value61)) {
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
    if (json.containsKey('completedAt')) {
      final value62 = json['completedAt'];
      if (value62 != null) {
        if (value62 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'completedAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern1.hasMatch(value62)) {
            addFieldError(
              errors,
              joinPath(path, 'completedAt'),
              PlatformErrorCode.validationInvalidFormat.code,
            );
          }
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'completedAt'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('expiresAt')) {
      final value63 = json['expiresAt'];
      if (value63 != null) {
        if (value63 is! String) {
          addFieldError(
            errors,
            joinPath(path, 'expiresAt'),
            PlatformErrorCode.validationInvalidType.code,
          );
        } else {
          if (!_pattern1.hasMatch(value63)) {
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
    if (json.containsKey('result')) {
      final value64 = json['result'];
      if (value64 != null) {
        ReportResultSchema.check(
          value64,
          joinPath(path, 'result'),
          errors,
          acceptUnknownEnums: acceptUnknownEnums,
        );
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'result'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [ReportRunDetail] against its contract.
extension ReportRunDetailValidation on ReportRunDetail {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ReportRunDetailSchema.validate(toJson());
}

/// Validator for [DownloadReportRunRequest] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class DownloadReportRunRequestSchema {
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
    if (json.containsKey('runId')) {
      final value65 = json['runId'];
      if (value65 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'runId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value65)) {
          addFieldError(
            errors,
            joinPath(path, 'runId'),
            PlatformErrorCode.validationInvalidFormat.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'runId'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    for (final key in json.keys) {
      if (!const <String>{'runId'}.contains(key)) {
        addFieldError(
          errors,
          joinPath(path, key),
          PlatformErrorCode.validationUnknownField.code,
        );
      }
    }
  }
}

/// Validation of [DownloadReportRunRequest] against its contract.
extension DownloadReportRunRequestValidation on DownloadReportRunRequest {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      DownloadReportRunRequestSchema.validate(toJson());
}

/// Validator for [ReportDownload] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class ReportDownloadSchema {
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
    if (json.containsKey('fileName')) {
      final value66 = json['fileName'];
      if (value66 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'fileName'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value66.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'fileName'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value66.length > 200) {
          addFieldError(
            errors,
            joinPath(path, 'fileName'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'fileName'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('contentType')) {
      final value67 = json['contentType'];
      if (value67 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'contentType'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value67.isEmpty) {
          addFieldError(
            errors,
            joinPath(path, 'contentType'),
            PlatformErrorCode.validationTooShort.code,
          );
        }
        if (value67.length > 100) {
          addFieldError(
            errors,
            joinPath(path, 'contentType'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'contentType'),
        PlatformErrorCode.validationRequired.code,
      );
    }
    if (json.containsKey('content')) {
      final value68 = json['content'];
      if (value68 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'content'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value68.length > 8000000) {
          addFieldError(
            errors,
            joinPath(path, 'content'),
            PlatformErrorCode.validationTooLong.code,
          );
        }
      }
    } else {
      addFieldError(
        errors,
        joinPath(path, 'content'),
        PlatformErrorCode.validationRequired.code,
      );
    }
  }
}

/// Validation of [ReportDownload] against its contract.
extension ReportDownloadValidation on ReportDownload {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => ReportDownloadSchema.validate(toJson());
}

/// Validator for [EraseReportsUserInput] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class EraseReportsUserInputSchema {
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
      final value69 = json['user'];
      UserRefSchema.check(
        value69,
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

/// Validation of [EraseReportsUserInput] against its contract.
extension EraseReportsUserInputValidation on EraseReportsUserInput {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() => EraseReportsUserInputSchema.validate(toJson());
}

/// Validator for [EraseReportsUserResult] generated from the contract JSON Schema.
///
/// Returns the same codes and field paths as the server.
abstract final class EraseReportsUserResultSchema {
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
      final value70 = json['userId'];
      if (value70 is! String) {
        addFieldError(
          errors,
          joinPath(path, 'userId'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (!_pattern0.hasMatch(value70)) {
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
      final value71 = json['affectedRows'];
      if (value71 is! num ||
          !value71.isFinite ||
          value71 != value71.roundToDouble()) {
        addFieldError(
          errors,
          joinPath(path, 'affectedRows'),
          PlatformErrorCode.validationInvalidType.code,
        );
      } else {
        if (value71 < 0) {
          addFieldError(
            errors,
            joinPath(path, 'affectedRows'),
            PlatformErrorCode.validationTooSmall.code,
          );
        }
        if (value71 > 9007199254740991) {
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

/// Validation of [EraseReportsUserResult] against its contract.
extension EraseReportsUserResultValidation on EraseReportsUserResult {
  /// Errors in this object, or an empty list if it matches the contract.
  List<FieldError> validate() =>
      EraseReportsUserResultSchema.validate(toJson());
}
