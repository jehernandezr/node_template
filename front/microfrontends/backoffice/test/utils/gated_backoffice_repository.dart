import 'dart:async';
import 'dart:collection';

import 'package:mf_backoffice/src/data/backoffice_repository.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:mf_backoffice/src/shared/types/backoffice_types.dart';

/// Forwards every call to [_inner], records the order in which calls start
/// and can hold the answer of a call until the test releases it. It controls
/// the order of responses and proves that two loads run in parallel.
final class GatedBackofficeRepository implements BackofficeRepository {
  GatedBackofficeRepository(this._inner);

  final BackofficeRepository _inner;
  final Map<BackofficeOperation, Queue<Completer<void>>> _gates = {};
  final List<BackofficeOperation> _started = [];

  /// Operations in the order their calls started.
  List<BackofficeOperation> get started => List.unmodifiable(_started);

  /// Holds the answer of the next call of [operation] until the returned
  /// completer completes. Calls without a pending gate answer at once.
  Completer<void> holdNext(BackofficeOperation operation) {
    final gate = Completer<void>();
    _gates.putIfAbsent(operation, Queue.new).add(gate);
    return gate;
  }

  Future<T> _call<T>(
    BackofficeOperation operation,
    Future<T> Function() call,
  ) async {
    _started.add(operation);
    final queue = _gates[operation];
    if (queue != null && queue.isNotEmpty) await queue.removeFirst().future;
    return call();
  }

  @override
  void dispose() => _inner.dispose();

  @override
  Future<BackofficeOverview> overview() =>
      _call(BackofficeOperation.overview, _inner.overview);

  @override
  Future<List<Tenant>> listTenants({
    String query = '',
    TenantRegion? region,
    TenantStatus? status,
  }) => _call(
    BackofficeOperation.listTenants,
    () => _inner.listTenants(query: query, region: region, status: status),
  );

  @override
  Future<Tenant?> tenant(String id) =>
      _call(BackofficeOperation.tenant, () => _inner.tenant(id));

  @override
  Future<List<AuditEntry>> tenantAudit(String tenantId) => _call(
    BackofficeOperation.tenantAudit,
    () => _inner.tenantAudit(tenantId),
  );

  @override
  Future<List<Saga>> listSagas({SagaStatus? status}) => _call(
    BackofficeOperation.listSagas,
    () => _inner.listSagas(status: status),
  );

  @override
  Future<Saga?> saga(String id) =>
      _call(BackofficeOperation.saga, () => _inner.saga(id));

  @override
  Future<List<AuditEntry>> sagaAudit(String sagaId) =>
      _call(BackofficeOperation.sagaAudit, () => _inner.sagaAudit(sagaId));

  @override
  Future<void> applySagaAction({
    required String sagaId,
    required SagaManualAction action,
    required String reason,
  }) => _call(
    BackofficeOperation.applySagaAction,
    () =>
        _inner.applySagaAction(sagaId: sagaId, action: action, reason: reason),
  );

  @override
  Future<List<DeadLetterQueue>> deadLetterQueues() =>
      _call(BackofficeOperation.deadLetterQueues, _inner.deadLetterQueues);

  @override
  Future<List<DeadLetterMessage>> deadLetterMessages(String queue) => _call(
    BackofficeOperation.deadLetterMessages,
    () => _inner.deadLetterMessages(queue),
  );

  @override
  Future<int> redrive(String queue) =>
      _call(BackofficeOperation.redrive, () => _inner.redrive(queue));
}
