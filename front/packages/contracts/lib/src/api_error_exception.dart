import 'platform_error_code.dart';
import 'problem_details.dart';

/// Thrown when the API answers with an error. Wraps the [ProblemDetails] it received.
class ApiErrorException implements Exception {
  /// Creates an exception for [problem].
  const ApiErrorException(this.problem);

  /// The problem document returned by the API.
  final ProblemDetails problem;

  /// The known platform code for this error, or null when the code is not in [PlatformErrorCode].
  PlatformErrorCode? get platformCode => PlatformErrorCode.fromCode(problem.code);

  @override
  String toString() => 'ApiErrorException(${problem.status} ${problem.code}: ${problem.title})';
}
