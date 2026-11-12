import 'package:contracts/contracts.dart';

/// Groups field errors by field path, for showing them next to form fields.
/// Errors without a field go under the empty string.
Map<String, List<String>> fieldErrorsByField(Iterable<FieldError> errors) {
  final result = <String, List<String>>{};
  for (final error in errors) {
    result.putIfAbsent(error.field ?? '', () => []).add(error.code);
  }
  return result;
}
