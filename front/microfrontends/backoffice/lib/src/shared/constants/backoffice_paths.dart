/// Locations of the backoffice screens, for `context.go`.
abstract final class BackofficePaths {
  /// Overview, and parent of every other backoffice route.
  static const String root = '/backoffice';

  /// Tenant list.
  static const String tenants = '$root/tenants';

  /// Saga list.
  static const String sagas = '$root/sagas';

  /// Dead-letter queues.
  static const String dlq = '$root/dlq';

  /// Detail of the tenant [id].
  static String tenant(String id) => '$tenants/${Uri.encodeComponent(id)}';

  /// Detail of the saga [id].
  static String saga(String id) => '$sagas/${Uri.encodeComponent(id)}';

  /// Messages of the dead-letter queue [queue].
  static String dlqQueue(String queue) => '$dlq/${Uri.encodeComponent(queue)}';
}
