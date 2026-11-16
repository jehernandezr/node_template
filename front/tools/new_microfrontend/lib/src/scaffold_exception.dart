/// A request the scaffolder cannot satisfy: a bad id, a label that is empty,
/// a package that already exists or a workspace file it cannot edit.
final class ScaffoldException implements Exception {
  /// Creates the exception with a message for the person at the terminal.
  const ScaffoldException(this.message);

  /// What went wrong and what to change.
  final String message;

  @override
  String toString() => 'ScaffoldException: $message';
}
