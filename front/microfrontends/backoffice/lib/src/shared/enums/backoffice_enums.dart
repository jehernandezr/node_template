/// Enums shared by the backoffice screens and data.
///
/// The platform contracts (`package:contracts`) do not publish tenants, sagas
/// or dead-letter queues yet. When they do, these enums are replaced by the
/// generated ones.
library;

/// Lifecycle state of a tenant.
enum TenantStatus {
  /// Working normally.
  active,

  /// Blocked, for example for lack of payment.
  suspended,

  /// Being created.
  provisioning,

  /// Being deleted.
  deleting,
}

/// Region where a tenant stores its data.
enum TenantRegion {
  /// Western Europe.
  euWest,

  /// Eastern United States.
  usEast,

  /// Eastern South America.
  saEast,
}

/// Saga states, including the ones that need a person.
enum SagaStatus {
  /// Running its steps.
  running,

  /// Waiting for the reply of a step.
  waitingReply,

  /// Paused before retrying a step.
  suspended,

  /// Finished successfully.
  completed,

  /// Undoing its steps.
  compensating,

  /// Finished undoing its steps.
  compensated,

  /// A compensation failed.
  compensationFailed,

  /// Needs a person to decide.
  requiresIntervention,
}

/// Whether a step ran forward or as its compensation.
enum SagaDirection {
  /// The step itself.
  forward,

  /// The step that undoes it.
  compensation,
}

/// Result of one attempt at a step.
enum SagaStepStatus {
  /// Sent and not answered yet.
  dispatched,

  /// Answered with success.
  succeeded,

  /// Answered with an error.
  failed,
}

/// Manual actions an operator can apply to a saga. Each one needs a reason.
enum SagaManualAction {
  /// Retries the failed step.
  retryStep,

  /// Undoes the saga.
  forceCompensation,

  /// Marks it resolved by hand.
  markResolved,
}

/// Calls of the backoffice repository. A demo repository tags each call with
/// one so a scheduled failure can target a single operation.
enum BackofficeOperation {
  /// Loading the overview.
  overview,

  /// Listing tenants.
  listTenants,

  /// Loading one tenant.
  tenant,

  /// Loading the audit of a tenant.
  tenantAudit,

  /// Listing sagas.
  listSagas,

  /// Loading one saga.
  saga,

  /// Loading the audit of a saga.
  sagaAudit,

  /// Applying a manual action to a saga.
  applySagaAction,

  /// Listing the dead-letter queues.
  deadLetterQueues,

  /// Listing the messages of a queue.
  deadLetterMessages,

  /// Sending messages back to their queue.
  redrive,
}

/// Sections of the backoffice, one per entry of its section navigation.
enum BackofficeSection {
  /// The overview.
  overview,

  /// The tenants.
  tenants,

  /// The sagas.
  sagas,

  /// The dead-letter queues.
  dlq,
}
