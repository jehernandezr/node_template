/// Enums shared by the backoffice screens and data.
///
/// The platform contracts (`package:contracts`) do not publish tenants, sagas
/// or dead-letter queues yet. When they do, these enums are replaced by the
/// generated ones.
library;

/// Lifecycle state of a tenant.
enum TenantStatus { active, suspended, provisioning, deleting }

/// Region where a tenant stores its data.
enum TenantRegion { euWest, usEast, saEast }

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

/// Manual actions an operator can apply to a saga. Each one needs a reason.
enum SagaManualAction { retryStep, forceCompensation, markResolved }
