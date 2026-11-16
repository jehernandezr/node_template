import 'package:shell_core/shell_core.dart';

/// Id of the microfrontend and first segment of its routes.
const MicrofrontendId backofficeId = MicrofrontendId('backoffice');

/// Menu label. The shell draws it before the microfrontend loads, so it
/// travels with the manifest instead of the deferred ARB files.
const MenuLabel backofficeMenuLabel = MenuLabel({
  'es': 'Administración',
  'en': 'Administration',
});

/// Locations of the backoffice screens, for the manifest and `context.go`.
abstract final class BackofficePaths {
  /// Overview, and parent of every other backoffice route.
  static const String root = '/backoffice';

  /// Segment of the tenant list, child of [root].
  static const String tenantsSegment = 'tenants';

  /// Segment of the saga list, child of [root].
  static const String sagasSegment = 'sagas';

  /// Segment of the dead-letter queues, child of [root].
  static const String dlqSegment = 'dlq';

  /// Name of the id path parameter of a tenant or a saga.
  static const String idParam = 'id';

  /// Name of the queue path parameter.
  static const String queueParam = 'queue';

  /// Tenant list.
  static const String tenants = '$root/$tenantsSegment';

  /// Saga list.
  static const String sagas = '$root/$sagasSegment';

  /// Dead-letter queues.
  static const String dlq = '$root/$dlqSegment';

  /// Detail of the tenant [id].
  static String tenant(String id) => '$tenants/${Uri.encodeComponent(id)}';

  /// Detail of the saga [id].
  static String saga(String id) => '$sagas/${Uri.encodeComponent(id)}';

  /// Messages of the dead-letter queue [queue].
  static String dlqQueue(String queue) => '$dlq/${Uri.encodeComponent(queue)}';
}
