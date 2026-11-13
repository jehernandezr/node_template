import 'package:contracts/contracts.dart';

import '../shared/enums/backoffice_enums.dart';
import '../shared/types/backoffice_types.dart';
import 'backoffice_repository.dart';

/// In-memory repository with fixed seed data. Writes change only this instance.
class FakeBackofficeRepository implements BackofficeRepository {
  FakeBackofficeRepository()
    : _tenants = List.of(_seedTenants),
      _tenantAudit = {
        for (final e in _seedTenantAudit.entries) e.key: List.of(e.value),
      },
      _sagas = List.of(_seedSagas),
      _sagaAudit = {
        for (final e in _seedSagaAudit.entries) e.key: List.of(e.value),
      },
      _queues = {for (final e in _seedQueues.entries) e.key: List.of(e.value)};

  final List<Tenant> _tenants;
  final Map<String, List<AuditEntry>> _tenantAudit;
  final List<Saga> _sagas;
  final Map<String, List<AuditEntry>> _sagaAudit;
  final Map<String, List<DeadLetterMessage>> _queues;

  /// Whether the scope already released this repository.
  bool get isDisposed => _disposed;
  bool _disposed = false;

  @override
  void dispose() {
    _disposed = true;
  }

  @override
  Future<BackofficeOverview> overview() async {
    final queued = _queues.values.fold<int>(
      0,
      (sum, list) => sum + list.length,
    );
    return BackofficeOverview(
      tenantCount: _tenants.length,
      sagasNeedingIntervention: _sagas.where((s) => s.needsIntervention).length,
      deadLetterMessages: queued,
    );
  }

  @override
  Future<List<Tenant>> listTenants({
    String query = '',
    TenantRegion? region,
    TenantStatus? status,
  }) async {
    final needle = query.trim().toLowerCase();
    return _tenants.where((t) {
      final matchesQuery =
          needle.isEmpty ||
          t.name.toLowerCase().contains(needle) ||
          t.id.toLowerCase().contains(needle);
      final matchesRegion = region == null || t.region == region;
      final matchesStatus = status == null || t.status == status;
      return matchesQuery && matchesRegion && matchesStatus;
    }).toList();
  }

  @override
  Future<Tenant?> tenant(String id) async {
    for (final tenant in _tenants) {
      if (tenant.id == id) return tenant;
    }
    return null;
  }

  @override
  Future<List<AuditEntry>> tenantAudit(String tenantId) async =>
      _newestFirst(_tenantAudit[tenantId] ?? const []);

  @override
  Future<List<Saga>> listSagas({SagaStatus? status}) async {
    final list =
        _sagas.where((s) => status == null || s.status == status).toList()
          ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return list;
  }

  @override
  Future<Saga?> saga(String id) async {
    for (final saga in _sagas) {
      if (saga.id == id) return saga;
    }
    return null;
  }

  @override
  Future<List<AuditEntry>> sagaAudit(String sagaId) async =>
      _newestFirst(_sagaAudit[sagaId] ?? const []);

  @override
  Future<void> applySagaAction({
    required String sagaId,
    required SagaManualAction action,
    required String reason,
  }) async {
    final trimmed = reason.trim();
    if (trimmed.isEmpty) {
      throw _problem(
        PlatformErrorCode.validationRequired,
        'A reason is required',
      );
    }
    final index = _sagas.indexWhere((s) => s.id == sagaId);
    if (index == -1) {
      throw _problem(PlatformErrorCode.resourceNotFound, 'Saga not found');
    }

    final saga = _sagas[index];
    final next = switch (action) {
      SagaManualAction.retryStep => saga.copyWith(status: SagaStatus.running),
      SagaManualAction.forceCompensation => saga.copyWith(
        status: SagaStatus.compensating,
      ),
      SagaManualAction.markResolved => saga.copyWith(
        status: SagaStatus.completed,
      ),
    };
    _sagas[index] = next.copyWith(updatedAt: _now);
    _sagaAudit
        .putIfAbsent(sagaId, () => [])
        .add(
          AuditEntry(
            occurredAt: _now,
            actor: _operator,
            action: 'saga.${action.name}',
            entity: 'saga:$sagaId',
            traceId: saga.traceId,
            detail: trimmed,
          ),
        );
  }

  @override
  Future<List<DeadLetterQueue>> deadLetterQueues() async => [
    for (final entry in _queues.entries)
      DeadLetterQueue(name: entry.key, messageCount: entry.value.length),
  ];

  @override
  Future<List<DeadLetterMessage>> deadLetterMessages(String queue) async =>
      List.of(_queues[queue] ?? const <DeadLetterMessage>[]);

  @override
  Future<int> redrive(String queue) async {
    final messages = _queues[queue];
    if (messages == null) {
      throw _problem(PlatformErrorCode.resourceNotFound, 'Queue not found');
    }
    final moved = messages.length;
    messages.clear();
    return moved;
  }

  static ApiErrorException _problem(PlatformErrorCode code, String title) =>
      ApiErrorException(
        ProblemDetails(
          type: 'about:blank',
          title: title,
          status: code.httpStatus,
          code: code.code,
        ),
      );

  static List<AuditEntry> _newestFirst(List<AuditEntry> entries) =>
      List.of(entries)..sort((a, b) => b.occurredAt.compareTo(a.occurredAt));

  static const _operator = 'operador.soporte';
  static final _now = DateTime(2026, 11, 11, 9, 0);
}

final _t0 = DateTime(2026, 11, 10, 14, 5);

final List<Tenant> _seedTenants = [
  const Tenant(
    id: 't-001',
    name: 'Acme Logística',
    region: TenantRegion.euWest,
    status: TenantStatus.active,
    plan: 'Enterprise',
    shardGroup: 'shards-eu-1',
    usersCount: 240,
  ),
  const Tenant(
    id: 't-002',
    name: 'Panadería Luna',
    region: TenantRegion.saEast,
    status: TenantStatus.active,
    plan: 'Starter',
    shardGroup: 'shards-sa-1',
    usersCount: 6,
  ),
  const Tenant(
    id: 't-003',
    name: 'Clínica Norte',
    region: TenantRegion.usEast,
    status: TenantStatus.suspended,
    plan: 'Business',
    shardGroup: 'shards-us-dedicated-1',
    usersCount: 58,
  ),
  const Tenant(
    id: 't-004',
    name: 'Textiles Andes',
    region: TenantRegion.saEast,
    status: TenantStatus.provisioning,
    plan: 'Business',
    shardGroup: 'shards-sa-2',
    usersCount: 1,
  ),
  const Tenant(
    id: 't-005',
    name: 'Fintech Río',
    region: TenantRegion.euWest,
    status: TenantStatus.active,
    plan: 'Enterprise',
    shardGroup: 'shards-eu-2',
    usersCount: 412,
  ),
];

final Map<String, List<AuditEntry>> _seedTenantAudit = {
  't-001': [
    AuditEntry(
      occurredAt: _t0,
      actor: 'ana.torres',
      action: 'tenant.plan_changed',
      entity: 'tenant:t-001',
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      detail: 'Starter a Enterprise',
    ),
    AuditEntry(
      occurredAt: DateTime(2026, 9, 2, 10, 30),
      actor: 'sistema',
      action: 'tenant.created',
      entity: 'tenant:t-001',
      traceId: '9d1c4a2e7f0b4c3d8e6a5b4c3d2e1f0a',
    ),
  ],
  't-003': [
    AuditEntry(
      occurredAt: DateTime(2026, 11, 8, 17, 45),
      actor: 'facturacion.bot',
      action: 'tenant.suspended',
      entity: 'tenant:t-003',
      traceId: '7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d',
      detail: 'Factura vencida',
    ),
  ],
};

final List<Saga> _seedSagas = [
  Saga(
    id: 's-101',
    type: 'TenantOnboarding',
    status: SagaStatus.completed,
    tenantId: 't-002',
    traceId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    updatedAt: DateTime(2026, 11, 9, 11, 20),
    steps: const [
      SagaStep(
        order: 1,
        operation: 'CreateTenant',
        direction: SagaDirection.forward,
        status: SagaStepStatus.succeeded,
      ),
      SagaStep(
        order: 2,
        operation: 'OpenBillingAccount',
        direction: SagaDirection.forward,
        status: SagaStepStatus.succeeded,
      ),
      SagaStep(
        order: 3,
        operation: 'AssignShard',
        direction: SagaDirection.forward,
        status: SagaStepStatus.succeeded,
      ),
      SagaStep(
        order: 4,
        operation: 'SendWelcomeEmail',
        direction: SagaDirection.forward,
        status: SagaStepStatus.succeeded,
      ),
    ],
  ),
  Saga(
    id: 's-102',
    type: 'TenantOnboarding',
    status: SagaStatus.requiresIntervention,
    tenantId: 't-004',
    traceId: 'b2c3d4e5f60718293a4b5c6d7e8f9012',
    updatedAt: DateTime(2026, 11, 10, 8, 12),
    steps: const [
      SagaStep(
        order: 1,
        operation: 'CreateTenant',
        direction: SagaDirection.forward,
        status: SagaStepStatus.succeeded,
      ),
      SagaStep(
        order: 2,
        operation: 'OpenBillingAccount',
        direction: SagaDirection.forward,
        status: SagaStepStatus.failed,
        errorCode: 'BILLING.ACCOUNT.DUPLICATED',
      ),
      SagaStep(
        order: 3,
        operation: 'OpenBillingAccount',
        direction: SagaDirection.compensation,
        status: SagaStepStatus.failed,
        errorCode: 'BILLING.ACCOUNT.LOCKED',
      ),
    ],
  ),
  Saga(
    id: 's-103',
    type: 'TenantMove',
    status: SagaStatus.suspended,
    tenantId: 't-001',
    traceId: 'c3d4e5f60718293a4b5c6d7e8f901234',
    updatedAt: DateTime(2026, 11, 10, 22, 40),
    steps: const [
      SagaStep(
        order: 1,
        operation: 'FreezeTenantWrites',
        direction: SagaDirection.forward,
        status: SagaStepStatus.succeeded,
      ),
      SagaStep(
        order: 2,
        operation: 'CopyTenantData',
        direction: SagaDirection.forward,
        status: SagaStepStatus.failed,
        errorCode: 'PLATFORM.SHARDING.TENANT_MIGRATING',
      ),
    ],
  ),
  Saga(
    id: 's-104',
    type: 'AccountDeletion',
    status: SagaStatus.compensationFailed,
    tenantId: 't-003',
    traceId: 'd4e5f60718293a4b5c6d7e8f9012345a',
    updatedAt: DateTime(2026, 11, 11, 3, 15),
    steps: const [
      SagaStep(
        order: 1,
        operation: 'DeleteUsers',
        direction: SagaDirection.forward,
        status: SagaStepStatus.succeeded,
      ),
      SagaStep(
        order: 2,
        operation: 'DeleteFiles',
        direction: SagaDirection.forward,
        status: SagaStepStatus.failed,
        errorCode: 'STORAGE.TIMEOUT',
      ),
      SagaStep(
        order: 3,
        operation: 'RestoreUsers',
        direction: SagaDirection.compensation,
        status: SagaStepStatus.failed,
        errorCode: 'PLATFORM.INTERNAL.UNEXPECTED',
      ),
    ],
  ),
  Saga(
    id: 's-105',
    type: 'TenantOnboarding',
    status: SagaStatus.waitingReply,
    tenantId: 't-005',
    traceId: 'e5f60718293a4b5c6d7e8f90123456ab',
    updatedAt: DateTime(2026, 11, 11, 7, 58),
    steps: const [
      SagaStep(
        order: 1,
        operation: 'CreateTenant',
        direction: SagaDirection.forward,
        status: SagaStepStatus.succeeded,
      ),
      SagaStep(
        order: 2,
        operation: 'OpenBillingAccount',
        direction: SagaDirection.forward,
        status: SagaStepStatus.dispatched,
      ),
    ],
  ),
];

final Map<String, List<AuditEntry>> _seedSagaAudit = {
  's-104': [
    AuditEntry(
      occurredAt: DateTime(2026, 11, 11, 3, 16),
      actor: 'sistema',
      action: 'saga.compensation_failed',
      entity: 'saga:s-104',
      traceId: 'd4e5f60718293a4b5c6d7e8f9012345a',
    ),
  ],
};

final Map<String, List<DeadLetterMessage>> _seedQueues = {
  'notifications-tasks-events': [
    for (var i = 1; i <= 3; i++)
      DeadLetterMessage(
        id: 'msg-n-$i',
        type: 'tasks.task.updated.v1',
        firstError: 'SMTP timeout tras 30 s',
        receiveCount: 6,
        sentAt: _t0.subtract(Duration(hours: i)),
      ),
  ],
  'reports-commands': const [],
  'billing-events': [
    for (var i = 1; i <= 12; i++)
      DeadLetterMessage(
        id: 'msg-b-$i',
        type: 'billing.invoice.paid.v1',
        firstError: 'PLATFORM.VALIDATION.INVALID_INPUT: falta invoiceId',
        receiveCount: 5,
        sentAt: _t0.subtract(Duration(minutes: i * 20)),
      ),
  ],
};
