/// Thrown when no run of the tenant has the requested [id].
final class ReportRunNotFoundException implements Exception {
  const ReportRunNotFoundException(this.id);

  final String id;

  @override
  String toString() => 'ReportRunNotFoundException: $id';
}
