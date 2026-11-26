/// Models read by the backoffice screens. They mirror the read models of the
/// internal API; the screens never see the transport format.
library;

import '../enums/backoffice_enums.dart';

/// A tenant (organization) as seen by platform operators.
class Tenant {
  /// Tenant as the backoffice sees it.
  const Tenant({
    required this.id,
    required this.name,
    required this.region,
    required this.status,
    required this.plan,
    required this.shardGroup,
    required this.usersCount,
  });

  /// Id of the tenant.
  final String id;

  /// Name of the tenant.
  final String name;

  /// Region of its data.
  final TenantRegion region;

  /// Lifecycle status.
  final TenantStatus status;

  /// Plan it is subscribed to.
  final String plan;

  /// Shard group it lives in.
  final String shardGroup;

  /// Number of members.
  final int usersCount;
}

/// One audited action. Used for tenants and for manual saga actions.
class AuditEntry {
  /// Entry of an audit log.
  const AuditEntry({
    required this.occurredAt,
    required this.actor,
    required this.action,
    required this.entity,
    required this.traceId,
    this.detail,
  });

  /// When it happened.
  final DateTime occurredAt;

  /// Who did it.
  final String actor;

  /// What was done.
  final String action;

  /// What it was done to.
  final String entity;

  /// Trace of the request.
  final String traceId;

  /// Free text, for example the reason given for a manual saga action.
  final String? detail;
}

/// One line of a saga's step log.
class SagaStep {
  /// Step of a saga with its result.
  const SagaStep({
    required this.order,
    required this.operation,
    required this.direction,
    required this.status,
    this.errorCode,
  });

  /// Position of the step.
  final int order;

  /// Operation the step calls.
  final String operation;

  /// Forward or compensation.
  final SagaDirection direction;

  /// Result of the step.
  final SagaStepStatus status;

  /// Error code of a failed step, if any.
  final String? errorCode;
}

/// A saga instance with its step log.
class Saga {
  /// Saga as the backoffice sees it.
  const Saga({
    required this.id,
    required this.type,
    required this.status,
    required this.tenantId,
    required this.traceId,
    required this.steps,
    required this.updatedAt,
  });

  /// Id of the saga.
  final String id;

  /// Type of the saga.
  final String type;

  /// Status of the saga.
  final SagaStatus status;

  /// Tenant it works on.
  final String tenantId;

  /// Trace of the saga.
  final String traceId;

  /// Steps run so far.
  final List<SagaStep> steps;

  /// When it last changed.
  final DateTime updatedAt;

  /// Operation of the last logged step, or null when no step ran yet.
  String? get currentOperation => steps.isEmpty ? null : steps.last.operation;

  /// True for the states that raise an alert and need a person.
  bool get needsIntervention =>
      status == SagaStatus.requiresIntervention ||
      status == SagaStatus.compensationFailed;

  /// Copies the saga with another [status] or [updatedAt].
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

/// A dead-letter queue and how many messages it holds.
class DeadLetterQueue {
  /// Dead-letter queue with its message count.
  const DeadLetterQueue({required this.name, required this.messageCount});

  /// Name of the queue.
  final String name;

  /// Messages waiting in it.
  final int messageCount;
}

/// A message held in a dead-letter queue.
class DeadLetterMessage {
  /// Message in a dead-letter queue.
  const DeadLetterMessage({
    required this.id,
    required this.type,
    required this.firstError,
    required this.receiveCount,
    required this.sentAt,
  });

  /// Id of the message.
  final String id;

  /// Type of the message.
  final String type;

  /// First error it failed with.
  final String firstError;

  /// How many times it was received.
  final int receiveCount;

  /// When it was sent.
  final DateTime sentAt;
}

/// Counts for the overview page.
class BackofficeOverview {
  /// Counts of the backoffice overview.
  const BackofficeOverview({
    required this.tenantCount,
    required this.sagasNeedingIntervention,
    required this.deadLetterMessages,
  });

  /// Number of tenants.
  final int tenantCount;

  /// Sagas that need a person.
  final int sagasNeedingIntervention;

  /// Messages in dead-letter queues.
  final int deadLetterMessages;
}

/// A saga with its audit log, loaded together by the detail screen.
final class SagaWithAudit {
  /// Saga with its audit log.
  const SagaWithAudit({required this.saga, required this.audit});

  /// Null when the saga does not exist.
  final Saga? saga;

  /// Audit entries of the saga.
  final List<AuditEntry> audit;
}

/// A tenant with its audit log, loaded together by the detail screen.
final class TenantWithAudit {
  /// Tenant with its audit log.
  const TenantWithAudit({required this.tenant, required this.audit});

  /// Null when the tenant does not exist.
  final Tenant? tenant;

  /// Audit entries of the tenant.
  final List<AuditEntry> audit;
}
