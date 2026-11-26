/// Thrown when no run of the tenant has the requested [id].
final class ReportRunNotFoundException implements Exception {
  /// Thrown when the run [id] does not exist.
  const ReportRunNotFoundException(this.id);

  /// Id of the run.
  final String id;

  @override
  String toString() => 'ReportRunNotFoundException: $id';
}
