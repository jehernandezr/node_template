import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mf_verifier/mf_verifier.dart';
import 'package:mf_verifier/src/data/verifier_repository.dart';
import 'package:mf_verifier/src/l10n/generated/verifier_localizations.dart';
import 'package:mf_verifier/src/shared/constants/verifier_constants.dart';
import 'package:mf_verifier/src/shared/types/login_challenge.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

/// Mounts the verifier the way the shell does: through the real manifest
/// routes, under the shared test app with a [ShellAccessScope].
final class VerifierTestApp {
  const VerifierTestApp({this.locale = const Locale('es'), this.clock});

  /// Locale of the app.
  final Locale locale;

  /// Clock of the access scope. Null means a fresh [FakeClock].
  final FakeClock? clock;

  /// Challenge of the tests: valid for 150 seconds.
  static const LoginChallenge loginChallenge = LoginChallenge(
    id: 'challenge-1',
    context: LoginAttemptContext(
      browser: 'Chrome 128',
      os: 'Windows 11',
      city: 'Medellín',
      ip: '203.0.113.42',
    ),
    validFor: Duration(seconds: 150),
  );

  /// Services of a signed-in identity in demo mode.
  static ShellServices services() => ShellServices(
    session: SessionBuilder(userId: 'u1', tenantId: 't1').build(),
    mode: ShellMode.demo,
  );

  /// A scope with no repository registered yet.
  static MicrofrontendScope newScope() => MicrofrontendScope(services());

  /// A scope whose verifier repository is [repository].
  static MicrofrontendScope scopeWith(VerifierRepository repository) =>
      newScope()..get<VerifierRepository>((_) => repository);

  /// Texts of [language].
  static VerifierLocalizations l10n(String language) =>
      lookupVerifierLocalizations(Locale(language));

  /// Lets the deferred library load and the first frame build.
  static Future<void> settle(WidgetTester tester) async {
    // The deferred load completes on a zero-duration timer of the fake clock.
    await tester.pump(const Duration(milliseconds: 1));
    await tester.pump();
    await tester.pump();
  }

  /// The app that shows [scope]'s verifier at [verifierPath]. Each call
  /// builds its own deferred loader.
  Widget wrap(MicrofrontendScope scope) {
    final router = GoRouter(
      initialLocation: verifierPath,
      routes: verifierManifest.buildRoutes(
        DeferredLibraryLoader().page,
        () => scope,
      ),
    );
    return TestApp(
      locale: locale,
      clock: (clock ?? FakeClock()).now,
    ).wrapRouter(router);
  }
}
