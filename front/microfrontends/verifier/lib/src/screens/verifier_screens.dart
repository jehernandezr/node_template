/// Entry point of the verifier screen, used by the manifest.
///
/// This file is imported as `deferred`, so the repository and the verifier
/// texts travel with the screen.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import '../data/verifier_data.dart';
import '../l10n/generated/verifier_localizations.dart';
import 'verifier_screen.dart';

/// Builds the verifier screen for a [MicrofrontendScope]. The repository is
/// the scope's, so each identity has its own and releases it on close.
abstract final class VerifierScreens {
  /// Route `/verifier`.
  static Widget main(MicrofrontendScope scope) => DeferredLocalizations(
    delegates: const [VerifierLocalizations.delegate],
    child: VerifierScreen(
      repository: scope.repository(VerifierData.repository),
    ),
  );
}
