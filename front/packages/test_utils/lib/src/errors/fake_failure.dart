/// Failure that a fake throws to stand for a failed call.
///
/// It is an [Exception], so the code under test handles it as a failed call;
/// a `StateError` would escape as a programming error instead.
final class FakeFailure implements Exception {
  /// Creates the failure with an optional [message] for the test output.
  const FakeFailure([this.message = 'simulated failure']);

  /// What the test wanted to simulate.
  final String message;

  @override
  String toString() => 'FakeFailure: $message';
}
