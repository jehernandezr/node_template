import 'package:auth/auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_verifier/mf_verifier.dart';
import 'package:mf_verifier/src/data/fake_verifier_repository.dart';
import 'package:mf_verifier/src/l10n/generated/verifier_localizations.dart';
import 'package:mf_verifier/src/shared/types/login_challenge.dart';
import 'package:shell_core/shell_core.dart';

const challenge = LoginChallenge(
  id: 'challenge-1',
  context: LoginAttemptContext(
    browser: 'Chrome 128',
    os: 'Windows 11',
    city: 'Medellín',
    ip: '203.0.113.42',
  ),
  validFor: Duration(seconds: 150),
);

DefaultShellServices services({Map<Type, Object> extras = const {}}) =>
    DefaultShellServices(
      session: UserSession(userId: 'u1', tenantId: 't1'),
      eventBus: ShellEventBus(),
      extras: extras,
    );

FakeVerifierRepository fakeRepository({LoginChallenge? initial}) =>
    FakeVerifierRepository(FakeDeviceKeyPort(), initial: initial);

VerifierLocalizations l10nFor(String language) =>
    lookupVerifierLocalizations(Locale(language));

/// Mounts the screen through the real manifest routes, as the shell does.
Widget routedApp(
  MicrofrontendScope scope, {
  String language = 'es',
  UserSession? session,
}) {
  final router = GoRouter(
    initialLocation: '/verifier',
    routes: verifierManifest.buildRoutes(deferredPage, () => scope),
  );
  final current = ValueNotifier(session ?? UserSession(userId: 'u1'));
  return MaterialApp.router(
    locale: Locale(language),
    supportedLocales: const [Locale('es'), Locale('en')],
    localizationsDelegates: [
      ...GlobalMaterialLocalizations.delegates,
      AppLocalizations.delegate,
    ],
    routerConfig: router,
    builder: (context, child) =>
        ShellAccessScope(session: current, child: child!),
  );
}

/// Pumps until the deferred library has loaded and the screen is built.
Future<void> settle(WidgetTester tester) async {
  // The deferred load completes on a zero-duration timer of the fake clock.
  await tester.pump(const Duration(milliseconds: 1));
  await tester.pump();
  await tester.pump();
}
