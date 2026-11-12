/// Models read by the backoffice screens. They mirror the backend read models
/// of the internal API; the screens never see the transport format.
library;

/// Lifecycle state of a tenant.
enum TenantStatus { active, suspended, provisioning, deleting }

/// Region where a tenant stores its data.
enum TenantRegion { euWest, usEast, saEast }

/// A tenant (organization) as seen by platform operators.
class Tenant {
  const Tenant({
    required this.id,
    required this.name,
    required this.region,
    required this.status,
    required this.plan,
    required this.shardGroup,
    required this.usersCount,
  });

  final String id;
  final String name;
  final TenantRegion region;
  final TenantStatus status;
  final String plan;
  final String shardGroup;
  final int usersCount;
}

/// One audited action. Used for tenants and for manual saga actions.
class AuditEntry {
  const AuditEntry({
    required this.occurredAt,
    required this.actor,
    required this.action,
    required this.entity,
    required this.traceId,
    this.detail,
  });

  final DateTime occurredAt;
  final String actor;
  final String action;
  final String entity;
  final String traceId;

  /// Free text, for example the reason given for a manual saga action.
  final String? detail;
}

/// Saga states, including the ones that need a person.
enum SagaStatus {
  running,
  waitingReply,
  suspended,
  completed,
  compensating,
  compensated,
  compensationFailed,
  requiresIntervention,
}

/// Whether a step ran forward or as its compensation.
enum SagaDirection { forward, compensation }

/// Result of one attempt at a step.
enum SagaStepStatus { dispatched, succeeded, failed }

/// One line of a saga's step log.
class SagaStep {
  const SagaStep({
    required this.order,
    required this.operation,
    required this.direction,
    required this.status,
    this.errorCode,
  });

  final int order;
  final String operation;
  final SagaDirection direction;
  final SagaStepStatus status;
  final String? errorCode;
}

/// A saga instance with its step log.
class Saga {
  const Saga({
    required this.id,
    required this.type,
    required this.status,
    required this.tenantId,
    required this.traceId,
    required this.steps,
    required this.updatedAt,
  });

  final String id;
  final String type;
  final SagaStatus status;
  final String tenantId;
  final String traceId;
  final List<SagaStep> steps;
  final DateTime updatedAt;

  /// Operation of the last logged step, or null when no step ran yet.
  String? get currentOperation => steps.isEmpty ? null : steps.last.operation;

  /// True for the states that raise an alert and need a person.
  bool get needsIntervention =>
      status == SagaStatus.requiresIntervention ||
      status == SagaStatus.compensationFailed;

  Saga copyWith({SagaStatus? status, DateTime? updatedAt}) => Saga(
    id: id,
    type: type,
    status: status ?? this.status,
    tenantId: tenantId,
    traceId: traceId,
    steps: steps,
    updatedAt: updatedAt ?? this.updatedAt,
  );
}

/// Manual actions an operator can apply to a saga. Each one needs a reason.
enum SagaManualAction { retryStep, forceCompensation, markResolved }

/// A dead-letter queue and how many messages it holds.
class DeadLetterQueue {
  const DeadLetterQueue({required this.name, required this.messageCount});

  final String name;
  final int messageCount;
}

/// A message held in a dead-letter queue.
class DeadLetterMessage {
  const DeadLetterMessage({
    required this.id,
    required this.type,
    required this.firstError,
    required this.receiveCount,
    required this.sentAt,
  });

  final String id;
  final String type;
  final String firstError;
  final int receiveCount;
  final DateTime sentAt;
}

/// Counts for the overview page.
class BackofficeOverview {
  const BackofficeOverview({
    required this.tenantCount,
    required this.sagasNeedingIntervention,
    required this.deadLetterMessages,
  });

  final int tenantCount;
  final int sagasNeedingIntervention;
  final int deadLetterMessages;
}
