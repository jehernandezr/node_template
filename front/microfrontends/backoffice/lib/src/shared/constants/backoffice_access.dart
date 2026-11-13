/// Who can use each part of the backoffice.
///
/// The manifest and the screens share these rules. The interface only hides
/// what a session cannot use; the API checks every request again.
library;

import 'package:contracts/contracts.dart' show MfaRules;
import 'package:shell_core/shell_core.dart';

/// Maximum age of the second factor to enter the backoffice, the step-up
/// window of the contract (`MfaRules.stepUpMaxAgeMinutes`). An older one sends
/// the user to the shell's step-up page.
const Duration backofficeMfaMaxAge = Duration(
  minutes: MfaRules.stepUpMaxAgeMinutes,
);

/// Roles that apply saga actions and redrive dead-letter queues.
const List<PlatformRole> backofficeOperatorRoles = [
  PlatformRole.superAdmin,
  PlatformRole.support,
];

/// Roles that read sagas and dead-letter queues. `finance` is not here: it
/// only sees the billing side (overview and tenants, with their plan).
const List<PlatformRole> backofficeOperationsReaderRoles = [
  PlatformRole.superAdmin,
  PlatformRole.support,
  PlatformRole.readOnly,
];

/// Access of the whole microfrontend: any platform role with a recent second
/// factor.
final AccessRule backofficeAccess = AccessRule.all([
  AccessRule.platformRoles(PlatformRole.values),
  AccessRule.mfa(backofficeMfaMaxAge),
]);

/// Reading sagas and dead-letter queues (lists and details).
final AccessRule backofficeOperationsReadAccess = AccessRule.platformRoles(
  backofficeOperationsReaderRoles,
);

/// Saga actions (retry, compensate, resolve) and dead-letter redrive.
final AccessRule backofficeOperationsWriteAccess = AccessRule.platformRoles(
  backofficeOperatorRoles,
);
