import 'package:contracts/contracts.dart';
import 'package:shell_core/shell_core.dart';

/// Id of the microfrontend and first segment of its routes.
const MicrofrontendId verifierId = MicrofrontendId('verifier');

/// Route of the verifier screen.
const String verifierPath = '/verifier';

/// Query parameter of an app link that names the login challenge.
const String verifierChallengeParam = 'challenge';

/// Menu label. The shell draws it before the microfrontend loads, so it
/// travels with the manifest instead of the deferred ARB files.
const MenuLabel verifierMenuLabel = MenuLabel({
  'es': 'Verificador',
  'en': 'Verifier',
});

/// Digits of the code a device generates for a login challenge. It comes from
/// the identity contract so the front and the backend agree.
const int verifierCodeLength = MfaRules.deviceCodeLength;

/// Digits per group when the code is shown, e.g. `1234 5678`.
const int verifierCodeGroupSize = 4;

/// How often the countdown of a challenge updates.
const Duration verifierTick = Duration(seconds: 1);
