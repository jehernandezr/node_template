import 'package:contracts/contracts.dart' show MfaRules;
import 'package:shell_core/shell_core.dart';

/// Microfrontend id and first segment of its routes.
const MicrofrontendId accountId = MicrofrontendId('account');

/// Base route of the microfrontend.
const String accountBasePath = '/account';

/// Menu label. The shell draws it before loading the microfrontend, so it
/// travels with the manifest and not in the deferred ARB files.
const MenuLabel accountMenuLabel = MenuLabel({'es': 'Cuenta', 'en': 'Account'});

/// Page size when listing sessions and devices (the contract maximum).
const int accountPageSize = 100;

/// Most pages the live repository walks per listing.
const int accountMaxPages = 50;

/// Maximum age of the second factor for sensitive actions, the contract one
/// (`MfaRules.stepUpMaxAgeMinutes`).
const Duration accountStepUpMaxAge = Duration(
  minutes: MfaRules.stepUpMaxAgeMinutes,
);

/// Artificial latency of the demo repository.
const Duration accountDemoDelay = Duration(milliseconds: 400);

/// Font of the recovery codes: fixed width, so similar characters stay apart.
const String accountCodeFontFamily = 'monospace';

/// Card width under which the action of a row moves below its text.
const double accountCompactRowWidth = 480;
