import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_verifier/src/data/demo_device_key.dart';
import 'package:mf_verifier/src/data/fake_verifier_repository.dart';
import 'package:mf_verifier/src/data/verifier_data.dart';
import 'package:mf_verifier/src/l10n/generated/verifier_localizations.dart';
import 'package:mf_verifier/src/screens/verifier_screen.dart';
import 'package:mf_verifier/src/shared/constants/verifier_constants.dart';
import 'package:mf_verifier/src/shared/types/login_challenge.dart';
import 'package:mf_verifier/src/shared/utils/verifier_codes.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/controlled_verifier_repository.dart';
import '../utils/verifier_app.dart';

final VerifierLocalizations _es = VerifierTestApp.l10n('es');

FakeVerifierRepository _fakeRepository({LoginChallenge? initial}) =>
    FakeVerifierRepository(const DemoDeviceKey(), initial: initial);

FakeVerifierRepository _scopeRepository(MicrofrontendScope scope) =>
    scope.repository(VerifierData.repository) as FakeVerifierRepository;

/// Mounts the verifier of [scope] through the routes and lets it settle.
Future<void> _mount(
  WidgetTester tester,
  MicrofrontendScope scope, {
  VerifierTestApp app = const VerifierTestApp(),
}) async {
  await tester.pumpWidget(app.wrap(scope));
  await VerifierTestApp.settle(tester);
}

Future<void> _confirmDeny(WidgetTester tester) async {
  await tester.tap(find.text(_es.denyButton));
  await tester.pumpAndSettle();
  await tester.tap(find.text(_es.denyConfirm));
  await tester.pumpAndSettle();
}

void main() {
  group('states', () {
    testWidgets('loading until the first event', (tester) async {
      await _mount(
        tester,
        VerifierTestApp.scopeWith(ControlledVerifierRepository()),
      );

      expect(find.byType(LoadingView), findsOneWidget);
      expect(find.text(_es.title), findsOneWidget);
    });

    testWidgets('error shows the localized message and retry resubscribes', (
      tester,
    ) async {
      final repo = ControlledVerifierRepository();
      await _mount(tester, VerifierTestApp.scopeWith(repo));

      repo.source.addError(StateError('raw failure text'));
      await tester.pump();

      expect(find.text(_es.loadError), findsOneWidget);
      expect(find.textContaining('raw failure text'), findsNothing);

      await tester.tap(find.text('Reintentar'));
      await tester.pump();
      expect(find.byType(LoadingView), findsOneWidget);

      repo.source.add(null);
      await tester.pump();
      expect(find.text(_es.readyTitle), findsOneWidget);
    });

    testWidgets('pending challenge renders the code and the context', (
      tester,
    ) async {
      final repo = _fakeRepository(initial: VerifierTestApp.loginChallenge);
      final code = await repo.autoCode(VerifierTestApp.loginChallenge.id);
      await _mount(tester, VerifierTestApp.scopeWith(repo));

      expect(find.text(groupCode(code)), findsOneWidget);
      expect(find.text('Chrome 128'), findsOneWidget);
      expect(find.text('Windows 11'), findsOneWidget);
      expect(find.text('Medellín'), findsOneWidget);
      expect(find.text('203.0.113.42'), findsOneWidget);
      expect(find.text(_es.denyButton), findsOneWidget);
      expect(find.text(_es.expiresIn('02:30')), findsOneWidget);
    });

    testWidgets('a failing code shows the localized failure', (tester) async {
      final repo = ControlledVerifierRepository()
        ..onAutoCode = (_) async => throw Exception('no key');
      await _mount(tester, VerifierTestApp.scopeWith(repo));

      repo.source.add(VerifierTestApp.loginChallenge);
      await VerifierTestApp.settle(tester);

      expect(find.text(_es.codeFailed), findsOneWidget);
      expect(find.textContaining('no key'), findsNothing);
    });

    testWidgets('countdown expiry switches to the empty state', (tester) async {
      final clock = FakeClock();
      await _mount(
        tester,
        VerifierTestApp.scopeWith(
          _fakeRepository(initial: VerifierTestApp.loginChallenge),
        ),
        app: VerifierTestApp(clock: clock),
      );

      clock.advance(verifierTick);
      await tester.pump(verifierTick);
      expect(find.text(_es.expiresIn('02:29')), findsOneWidget);

      // The rest of the challenge's validity, from the fixture.
      final rest = VerifierTestApp.loginChallenge.validFor - verifierTick;
      clock.advance(rest);
      await tester.pump(rest);
      expect(find.text(_es.readyTitle), findsOneWidget);
      expect(find.text(_es.denyButton), findsNothing);
    });

    testWidgets('no pending challenge shows the empty state', (tester) async {
      await _mount(tester, VerifierTestApp.scopeWith(_fakeRepository()));

      expect(find.text(_es.readyTitle), findsOneWidget);
      expect(find.text(_es.readyMessage), findsOneWidget);
    });

    testWidgets('new challenge arriving via the stream is rendered', (
      tester,
    ) async {
      final repo = _fakeRepository();
      final code = await repo.autoCode(VerifierTestApp.loginChallenge.id);
      await _mount(tester, VerifierTestApp.scopeWith(repo));
      expect(find.text(_es.readyTitle), findsOneWidget);

      repo.push(VerifierTestApp.loginChallenge);
      await VerifierTestApp.settle(tester);

      expect(find.text(_es.readyTitle), findsNothing);
      expect(find.text(groupCode(code)), findsOneWidget);
    });

    testWidgets('the routed screen renders in en', (tester) async {
      await _mount(
        tester,
        VerifierTestApp.scopeWith(_fakeRepository()),
        app: const VerifierTestApp(locale: Locale('en')),
      );

      expect(find.text('Verifier'), findsOneWidget);
      expect(find.text('This device is ready'), findsOneWidget);
    });

    testWidgets('the screen without a ShellAccessScope throws', (tester) async {
      final repo = ControlledVerifierRepository();
      addTearDown(repo.dispose);

      await tester.pumpWidget(
        MaterialApp(
          locale: const Locale('es'),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: [
            AppLocalizations.delegate,
            ...GlobalMaterialLocalizations.delegates,
          ],
          home: DeferredLocalizations(
            delegates: const [VerifierLocalizations.delegate],
            child: VerifierScreen(repository: repo),
          ),
        ),
      );
      await VerifierTestApp.settle(tester);

      expect(tester.takeException(), isA<StateError>());
    });
  });

  group('deny', () {
    testWidgets('asks for confirmation, blocks and shows the notice', (
      tester,
    ) async {
      await _mount(
        tester,
        VerifierTestApp.scopeWith(
          _fakeRepository(initial: VerifierTestApp.loginChallenge),
        ),
      );

      await tester.tap(find.text(_es.denyButton));
      await tester.pumpAndSettle();
      expect(find.text(_es.denyDialogTitle), findsOneWidget);

      await tester.tap(find.text(_es.denyConfirm));
      await tester.pumpAndSettle();

      expect(find.text(_es.denyDialogTitle), findsNothing);
      expect(find.text(_es.blockedTitle), findsOneWidget);
      expect(find.text(_es.readyTitle), findsOneWidget);
    });

    testWidgets('cancelling the dialog keeps the challenge pending', (
      tester,
    ) async {
      final repo = _fakeRepository(initial: VerifierTestApp.loginChallenge);
      final code = await repo.autoCode(VerifierTestApp.loginChallenge.id);
      await _mount(tester, VerifierTestApp.scopeWith(repo));

      await tester.tap(find.text(_es.denyButton));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cancelar'));
      await tester.pumpAndSettle();

      expect(find.text(groupCode(code)), findsOneWidget);
      expect(find.text(_es.blockedTitle), findsNothing);
    });

    testWidgets('the deny dialog uses the verifier texts', (tester) async {
      await _mount(
        tester,
        VerifierTestApp.scopeWith(
          _fakeRepository(initial: VerifierTestApp.loginChallenge),
        ),
      );

      await tester.tap(find.text(_es.denyButton));
      await tester.pumpAndSettle();

      expect(find.text(_es.denyDialogTitle), findsOneWidget);
      expect(find.text(_es.denyDialogBody), findsOneWidget);
      expect(find.text(_es.denyConfirm), findsOneWidget);
    });

    testWidgets('an API error shows the localized snackbar', (tester) async {
      final repo = ControlledVerifierRepository()
        ..onDeny = (_) async => throw const ContractViolationException(
          routeId: 'identity.deny',
          errors: [FieldError(code: 'invalid')],
        );
      await _mount(tester, VerifierTestApp.scopeWith(repo));
      repo.source.add(VerifierTestApp.loginChallenge);
      await VerifierTestApp.settle(tester);

      await _confirmDeny(tester);

      expect(find.text(_es.denyFailed), findsOneWidget);
      expect(find.text(_es.blockedTitle), findsNothing);
      expect(find.text(_es.denyButton), findsOneWidget);
    });
  });

  group('lifecycle', () {
    testWidgets('a network error on deny shows the localized snackbar', (
      tester,
    ) async {
      final repo = ControlledVerifierRepository()
        ..onDeny = (_) async => throw const FakeFailure();
      await _mount(tester, VerifierTestApp.scopeWith(repo));
      repo.source.add(VerifierTestApp.loginChallenge);
      await VerifierTestApp.settle(tester);

      await _confirmDeny(tester);

      expect(tester.takeException(), isNull);
      expect(find.text(_es.denyFailed), findsOneWidget);
      expect(find.text(_es.denyButton), findsOneWidget);
    });

    testWidgets('removing the screen cancels the subscription and ticker', (
      tester,
    ) async {
      final repo = ControlledVerifierRepository();
      await _mount(tester, VerifierTestApp.scopeWith(repo));
      repo.source.add(VerifierTestApp.loginChallenge);
      await tester.pump();
      await tester.pump(verifierTick);
      expect(repo.hasListener, isTrue);

      await tester.pumpWidget(const SizedBox());
      expect(repo.hasListener, isFalse);

      await tester.pump(const Duration(seconds: 5));
    });
  });

  group('identity isolation', () {
    testWidgets('a screen on a new scope shows no data of the previous one', (
      tester,
    ) async {
      final first = VerifierTestApp.newScope();
      _scopeRepository(first).push(VerifierTestApp.loginChallenge);
      await _mount(tester, first);
      expect(find.text('Medellín'), findsOneWidget);

      final second = VerifierTestApp.newScope();
      await _mount(tester, second);

      expect(find.text('Medellín'), findsNothing);
      expect(find.text(_es.readyTitle), findsOneWidget);
    });
  });

  group('accessibility', () {
    testWidgets('a challenge on screen is accessible', (tester) async {
      final repo = _fakeRepository(initial: VerifierTestApp.loginChallenge);
      await _mount(tester, VerifierTestApp.scopeWith(repo));

      await expectAccessible(tester);
    });
  });
}
