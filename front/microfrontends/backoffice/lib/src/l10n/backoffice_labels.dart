/// Localized labels of the backoffice enums. Part of the deferred l10n code:
/// only the screens import it.
library;

import '../shared/enums/backoffice_enums.dart';
import 'generated/backoffice_localizations.dart';

String tenantStatusLabel(BackofficeLocalizations l10n, TenantStatus status) =>
    switch (status) {
      TenantStatus.active => l10n.tenantStatusActive,
      TenantStatus.suspended => l10n.tenantStatusSuspended,
      TenantStatus.provisioning => l10n.tenantStatusProvisioning,
      TenantStatus.deleting => l10n.tenantStatusDeleting,
    };

String regionLabel(BackofficeLocalizations l10n, TenantRegion region) =>
    switch (region) {
      TenantRegion.euWest => l10n.regionEuWest,
      TenantRegion.usEast => l10n.regionUsEast,
      TenantRegion.saEast => l10n.regionSaEast,
    };

String sagaStatusLabel(BackofficeLocalizations l10n, SagaStatus status) =>
    switch (status) {
      SagaStatus.running => l10n.sagaStatusRunning,
      SagaStatus.waitingReply => l10n.sagaStatusWaitingReply,
      SagaStatus.suspended => l10n.sagaStatusSuspended,
      SagaStatus.completed => l10n.sagaStatusCompleted,
      SagaStatus.compensating => l10n.sagaStatusCompensating,
      SagaStatus.compensated => l10n.sagaStatusCompensated,
      SagaStatus.compensationFailed => l10n.sagaStatusCompensationFailed,
      SagaStatus.requiresIntervention => l10n.sagaStatusRequiresIntervention,
    };

String sagaDirectionLabel(
  BackofficeLocalizations l10n,
  SagaDirection direction,
) => switch (direction) {
  SagaDirection.forward => l10n.sagaDirectionForward,
  SagaDirection.compensation => l10n.sagaDirectionCompensation,
};

String stepStatusLabel(BackofficeLocalizations l10n, SagaStepStatus status) =>
    switch (status) {
      SagaStepStatus.dispatched => l10n.stepStatusDispatched,
      SagaStepStatus.succeeded => l10n.stepStatusSucceeded,
      SagaStepStatus.failed => l10n.stepStatusFailed,
    };

String manualActionLabel(
  BackofficeLocalizations l10n,
  SagaManualAction action,
) => switch (action) {
  SagaManualAction.retryStep => l10n.manualActionRetryStep,
  SagaManualAction.forceCompensation => l10n.manualActionForceCompensation,
  SagaManualAction.markResolved => l10n.manualActionMarkResolved,
};
