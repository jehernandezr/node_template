import 'package:meta/meta.dart';

/// A single field-level validation error inside [ProblemDetails.errors].
@immutable
class FieldError {
  /// Creates a field error. [field] is null for errors that are not tied to one field.
  const FieldError({required this.code, this.field, this.message});

  /// Parses a field error from its JSON map.
  factory FieldError.fromJson(Map<String, dynamic> json) => FieldError(
        code: json['code'] as String,
        field: json['field'] as String?,
        message: json['message'] as String?,
      );

  /// Name of the offending field, when there is one.
  final String? field;

  /// Machine-readable error code for this field.
  final String code;

  /// Human-readable description, if the backend sent one.
  final String? message;

  /// Serializes this error, omitting null fields.
  Map<String, dynamic> toJson() => {
        if (field != null) 'field': field,
        'code': code,
        if (message != null) 'message': message,
      };

  @override
  bool operator ==(Object other) =>
      other is FieldError &&
      other.field == field &&
      other.code == code &&
      other.message == message;

  @override
  int get hashCode => Object.hash(field, code, message);

  @override
  String toString() => 'FieldError(field: $field, code: $code, message: $message)';
}

/// An RFC 9457 problem document with the platform extensions `code`, `traceId` and `errors`.
@immutable
class ProblemDetails {
  /// Creates a problem document.
  const ProblemDetails({
    required this.type,
    required this.title,
    required this.status,
    required this.code,
    this.detail,
    this.instance,
    this.traceId,
    this.errors = const [],
  });

  /// Parses a problem document from its JSON map. Throws [FormatException]
  /// when a required member is missing or has the wrong type.
  factory ProblemDetails.fromJson(Map<String, dynamic> json) {
    try {
      final rawErrors = json['errors'] as List<dynamic>? ?? const [];
      return ProblemDetails(
        type: json['type'] as String,
        title: json['title'] as String,
        status: json['status'] as int,
        code: json['code'] as String,
        detail: json['detail'] as String?,
        instance: json['instance'] as String?,
        traceId: json['traceId'] as String?,
        errors: [
          for (final item in rawErrors)
            FieldError.fromJson(item as Map<String, dynamic>),
        ],
      );
    } on TypeError catch (error) {
      throw FormatException('Invalid problem details: $error', json);
    }
  }

  /// URI that identifies the problem type.
  final String type;

  /// Short summary of the problem type.
  final String title;

  /// HTTP status code.
  final int status;

  /// Explanation specific to this occurrence.
  final String? detail;

  /// URI reference for this occurrence.
  final String? instance;

  /// Machine-readable platform code, for example `PLATFORM.AUTH.FORBIDDEN`.
  /// Kept as a string so codes added later still parse.
  final String code;

  /// Trace identifier for correlating logs.
  final String? traceId;

  /// Field-level errors. Empty when there are none.
  final List<FieldError> errors;

  /// Serializes this document, omitting null members.
  Map<String, dynamic> toJson() => {
        'type': type,
        'title': title,
        'status': status,
        if (detail != null) 'detail': detail,
        if (instance != null) 'instance': instance,
        'code': code,
        if (traceId != null) 'traceId': traceId,
        'errors': [for (final error in errors) error.toJson()],
      };

  @override
  String toString() => 'ProblemDetails(status: $status, code: $code, title: $title)';
}
