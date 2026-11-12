/// Helpers used by the generated validators and decoders.
library;

import 'problem_details.dart';

/// Separator between segments of a field path, for example `items.0.name`.
const fieldPathSeparator = '.';

/// Appends [segment] to [base]. The root path is the empty string.
String joinPath(String base, String segment) =>
    base.isEmpty ? segment : '$base$fieldPathSeparator$segment';

/// Adds a [FieldError] for [path] with [code]. The root path has no field.
void addFieldError(List<FieldError> errors, String path, String code) {
  errors.add(FieldError(code: code, field: path.isEmpty ? null : path));
}

/// Email pattern for schemas that declare `format: email` without a pattern.
final emailPattern = RegExp(
  r"^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$",
);

/// UUID pattern for schemas that declare `format: uuid` without a pattern.
final uuidPattern = RegExp(
  r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
);

/// Decodes a required enum value. Throws [FormatException] for unknown values.
T decodeEnum<T extends Object>(
  Object? raw,
  T? Function(String code) parse,
  String type,
) {
  if (raw is! String) {
    throw FormatException('Invalid $type: expected a string', raw);
  }
  return parse(raw) ?? (throw FormatException('Unknown $type value', raw));
}
