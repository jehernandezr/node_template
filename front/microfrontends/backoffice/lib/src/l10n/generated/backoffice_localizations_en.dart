// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'backoffice_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class BackofficeLocalizationsEn extends BackofficeLocalizations {
  BackofficeLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get navOverview => 'Overview';

  @override
  String get navTenants => 'Tenants';

  @override
  String get navSagas => 'Sagas';

  @override
  String get navDlq => 'Dead-letter queues';

  @override
  String get loadError => 'Could not load the information. Try again.';

  @override
  String get notFound => 'We could not find this record.';

  @override
  String get filterAll => 'All';

  @override
  String get filterStatus => 'Status';

  @override
  String get filterRegion => 'Region';

  @override
  String get actor => 'Actor';

  @override
  String get action => 'Action';

  @override
  String get entity => 'Entity';

  @override
  String get traceId => 'Trace ID';

  @override
  String get auditTitle => 'Audit';

  @override
  String get auditEmpty => 'No audit records.';

  @override
  String get overviewTitle => 'Backoffice';

  @override
  String get overviewSubtitle => 'Platform status right now.';

  @override
  String get cardTenants => 'Tenants';

  @override
  String get cardSagas => 'Sagas that need intervention';

  @override
  String get cardDlq => 'Messages in dead-letter queues';

  @override
  String get cardOpen => 'View details';

  @override
  String get tenantsTitle => 'Tenants';

  @override
  String get tenantSearchLabel => 'Search by name or id';

  @override
  String get tenantsEmpty => 'No tenant matches the filters.';

  @override
  String get tenantDetailTitle => 'Tenant details';

  @override
  String get tenantPlan => 'Plan';

  @override
  String get tenantShardGroup => 'Shard group';

  @override
  String get tenantUsers => 'Users';

  @override
  String get tenantRegion => 'Region';

  @override
  String get tenantStatusActive => 'Active';

  @override
  String get tenantStatusSuspended => 'Suspended';

  @override
  String get tenantStatusProvisioning => 'Provisioning';

  @override
  String get tenantStatusDeleting => 'Deleting';

  @override
  String get regionEuWest => 'Western Europe';

  @override
  String get regionUsEast => 'US East';

  @override
  String get regionSaEast => 'South America East';

  @override
  String get sagasTitle => 'Sagas';

  @override
  String get sagasEmpty => 'No sagas with this status.';

  @override
  String get sagaDetailTitle => 'Saga details';

  @override
  String get sagaType => 'Type';

  @override
  String get sagaTenant => 'Tenant';

  @override
  String get sagaCurrentStep => 'Last step';

  @override
  String get sagaUpdated => 'Updated';

  @override
  String get sagaSteps => 'Steps';

  @override
  String get sagaStepsEmpty => 'The saga has not run any step yet.';

  @override
  String get sagaErrorCode => 'Error code';

  @override
  String get sagaManualActions => 'Manual actions';

  @override
  String get sagaIntervention => 'Needs intervention';

  @override
  String get sagaActionDone => 'Action recorded in the audit log.';

  @override
  String get reasonLabel => 'Reason (required)';

  @override
  String get reasonHelp =>
      'Explain why you are doing this action. It is recorded in the audit log.';

  @override
  String get sagaStatusRunning => 'Running';

  @override
  String get sagaStatusWaitingReply => 'Waiting for reply';

  @override
  String get sagaStatusSuspended => 'Suspended';

  @override
  String get sagaStatusCompleted => 'Completed';

  @override
  String get sagaStatusCompensating => 'Compensating';

  @override
  String get sagaStatusCompensated => 'Compensated';

  @override
  String get sagaStatusCompensationFailed => 'Compensation failed';

  @override
  String get sagaStatusRequiresIntervention => 'Needs intervention';

  @override
  String get sagaDirectionForward => 'Forward';

  @override
  String get sagaDirectionCompensation => 'Compensation';

  @override
  String get stepStatusDispatched => 'Dispatched';

  @override
  String get stepStatusSucceeded => 'Succeeded';

  @override
  String get stepStatusFailed => 'Failed';

  @override
  String get manualActionRetryStep => 'Retry step';

  @override
  String get manualActionForceCompensation => 'Force compensation';

  @override
  String get manualActionMarkResolved => 'Mark as resolved';

  @override
  String sagaStepLabel(int order, String operation) {
    return '$order. $operation';
  }

  @override
  String get dlqTitle => 'Dead-letter queues';

  @override
  String get dlqSubtitle => 'Messages that exhausted their retries.';

  @override
  String get dlqEmpty => 'No queues configured.';

  @override
  String get dlqMessagesTitle => 'Messages';

  @override
  String get dlqSelectQueue => 'Choose a queue to see its messages.';

  @override
  String get dlqMessagesEmpty => 'The queue has no messages.';

  @override
  String get dlqMessageType => 'Type';

  @override
  String get dlqFirstError => 'First error';

  @override
  String get dlqSentAt => 'Sent';

  @override
  String get dlqRedrive => 'Redrive';

  @override
  String get dlqRedriveTitle => 'Redrive messages';

  @override
  String dlqMessagesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count messages',
      one: '1 message',
    );
    return '$_temp0';
  }

  @override
  String dlqReceiveCount(int count) {
    return 'Receives: $count';
  }

  @override
  String dlqRedriveConfirm(int count, String queue) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count messages',
      one: '1 message',
    );
    return '$_temp0 from \"$queue\" will be moved back to their source queue. Check the first error before continuing.';
  }

  @override
  String dlqRedriveDone(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count messages redriven.',
      one: '1 message redriven.',
    );
    return '$_temp0';
  }
}
