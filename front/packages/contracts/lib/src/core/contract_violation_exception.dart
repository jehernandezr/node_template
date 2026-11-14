import 'package:meta/meta.dart';

import 'problem_details.dart';

/// Thrown when a request or a response does not match its generated contract.
///
/// For a request, the client throws it before any network call, with the same
/// [FieldError] codes and field paths the server would return.
@immutable
class ContractViolationException implements Exception {
  /// Creates the exception for [routeId] with the failed [errors].
  const ContractViolationException({
    required this.routeId,
    required this.errors,
    this.inResponse = false,
  });

  /// Stable id of the route, for example `identity.auth.sign-in`.
  final String routeId;

  /// Field errors found by the generated validator. Never empty.
  final List<FieldError> errors;

  /// True when the server response broke the contract; false for the request.
  final bool inResponse;

  @override
  String toString() =>
      'ContractViolationException($routeId ${inResponse ? 'response' : 'request'}: '
      '${errors.map((e) => '${e.field ?? '<root>'} ${e.code}').join(', ')})';
}
