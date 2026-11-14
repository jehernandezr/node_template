import 'package:shell_core/shell_core.dart';

import '../shared/enums/backoffice_enums.dart';
import '../shared/types/backoffice_types.dart';

/// Read and write access to the platform data the backoffice shows.
///
/// Screens depend only on this contract. `FakeBackofficeRepository` keeps the
/// data in memory. The real implementation will call the internal API with
/// `ApiClient` once `package:contracts` publishes the backoffice operations.
///
/// One instance per identity: the [MicrofrontendScope] creates it and calls
/// [dispose] when the identity changes.
abstract interface class BackofficeRepository implements ScopedResource {
  /// Counts for the overview cards.
  Future<BackofficeOverview> overview();

  /// Tenants whose name or id contains [query], filtered by [region] and [status].
  Future<List<Tenant>> listTenants({
    String query = '',
    TenantRegion? region,
    TenantStatus? status,
  });

  /// The tenant with [id], or null when it does not exist.
  Future<Tenant?> tenant(String id);

  /// Audit entries of a tenant, most recent first.
  Future<List<AuditEntry>> tenantAudit(String tenantId);

  /// Sagas, optionally filtered by [status], most recently updated first.
  Future<List<Saga>> listSagas({SagaStatus? status});

  /// The saga with [id], or null when it does not exist.
  Future<Saga?> saga(String id);

  /// Audit entries of a saga, including its manual actions.
  Future<List<AuditEntry>> sagaAudit(String sagaId);

  /// Applies a manual action and records it in the audit log.
  ///
  /// Throws an `ApiErrorException` with `PLATFORM.VALIDATION.REQUIRED` when
  /// [reason] is blank, and `PLATFORM.RESOURCE.NOT_FOUND` when the saga does not exist.
  Future<void> applySagaAction({
    required String sagaId,
    required SagaManualAction action,
    required String reason,
  });

  /// All dead-letter queues with their message counts.
  Future<List<DeadLetterQueue>> deadLetterQueues();

  /// Messages held in the queue [queue].
  Future<List<DeadLetterMessage>> deadLetterMessages(String queue);

  /// Moves every message of [queue] back to its source queue. Returns the count moved.
  ///
  /// Throws an `ApiErrorException` with `PLATFORM.RESOURCE.NOT_FOUND` when the queue does not exist.
  Future<int> redrive(String queue);
}
