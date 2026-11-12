import 'dart:async';

import 'package:auth/auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_verifier/src/data/fake_verifier_repository.dart';
import 'package:mf_verifier/src/data/login_challenge.dart';
import 'package:mf_verifier/src/data/verifier_repository.dart';
import 'package:mf_verifier/src/screens/verifier_screen.dart';
import 'package:mf_verifier/src/widgets/verifier_widgets.dart';
import 'package:shell_core/shell_core.dart';

const _challenge = LoginChallenge(
  id: 'challenge-1',
  context: LoginAttemptContext(
    browser: 'Chrome 128',
    os: 'Windows 11',
    city: 'Medellín',
    ip: '203.0.113.42',
  ),
  validFor: Duration(seconds: 150),
);

final VerifierLocalizations _es = lookupVerifierLocalizations(
  const Locale('es'),
);

FakeVerifierRepository _repository({LoginChallenge? initial}) =>
    FakeVerifierRepository(FakeDeviceKeyPort(), initial: initial);

Widget _app(Widget home) {
  return MaterialApp(
    locale: const Locale('es'),
    supportedLocales: const [Locale('es'), Locale('en')],
    localizationsDelegates: [
      ...GlobalMaterialLocalizations.delegates,
      AppLocalizations.delegate,
      VerifierLocalizations.delegate,
    ],
    home: home,
  );
}

Future<void> _pumpScreen(WidgetTester tester, VerifierRepository repo) {
  return tester.pumpWidget(_app(VerifierScreen(repository: repo)));
}

/// Source whose subscriptions can be counted, to check that dispose cancels
/// the screen's subscription.
final class _TrackingRepository implements VerifierRepository {
  final StreamController<LoginChallenge?> _source =
      StreamController<LoginChallenge?>();

  bool get hasListener => _source.hasListener;

  void emit(LoginChallenge? challenge) => _source.add(challenge);

  @override
  Stream<LoginChallenge?> pending() => _source.stream;

  @override
  Future<void> deny(String challengeId) async {}

  @override
  Future<String> autoCode(String challengeId) async => '12345678';

  @override
  void close() {
    unawaited(_source.close());
  }
}

void main() {
  group('groupCode', () {
    test('groups 8 digits as 4-4', () {
      expect(groupCode('12345678'), '1234 5678');
    });
  });

  group('formatCountdown', () {
    test('formats as mm:ss', () {
      expect(formatCountdown(150), '02:30');
      expect(formatCountdown(9), '00:09');
      expect(formatCountdown(-3), '00:00');
    });
  });

  test('strings come from VerifierLocalizations in es', () {
    expect(_es.title, 'Verificador');
    expect(_es.denyButton, 'No fui yo');
    expect(_es.expiresIn('02:30'), 'Caduca en 02:30');
    expect(_es.codeTitle, 'Código de verificación');
  });

  testWidgets(
    'pending challenge renders the code grouped 4-4 and the context',
    (tester) async {
      final repo = _repository(initial: _challenge);
      final code = await repo.autoCode(_challenge.id);
      await _pumpScreen(tester, repo);
      await tester.pump();

      expect(code, matches(RegExp(r'^\d{8}$')));
      expect(find.text(groupCode(code)), findsOneWidget);
      expect(find.text(_es.title), findsOneWidget);
      expect(find.text('Chrome 128'), findsOneWidget);
      expect(find.text('Windows 11'), findsOneWidget);
      expect(find.text('Medellín'), findsOneWidget);
      expect(find.text('203.0.113.42'), findsOneWidget);
      expect(find.text(_es.denyButton), findsOneWidget);
      expect(find.text(_es.expiresIn('02:30')), findsOneWidget);
    },
  );

  testWidgets('countdown expiry switches to the empty state', (tester) async {
    final repo = _repository(initial: _challenge);
    await _pumpScreen(tester, repo);
    await tester.pump();

    await tester.pump(const Duration(seconds: 1));
    expect(find.text(_es.expiresIn('02:29')), findsOneWidget);

    await tester.pump(const Duration(seconds: 149));
    expect(find.text(_es.readyTitle), findsOneWidget);
    expect(find.text(_es.denyButton), findsNothing);
    expect(find.text(_es.codeTitle), findsNothing);
  });

  testWidgets('no pending challenge shows the empty state', (tester) async {
    await _pumpScreen(tester, _repository());
    await tester.pump();

    expect(find.text(_es.readyTitle), findsOneWidget);
    expect(find.text(_es.readyMessage), findsOneWidget);
  });

  testWidgets('new challenge arriving via the stream is rendered', (
    tester,
  ) async {
    final repo = _repository();
    final code = await repo.autoCode(_challenge.id);
    await _pumpScreen(tester, repo);
    await tester.pump();
    expect(find.text(_es.readyTitle), findsOneWidget);

    repo.push(_challenge);
    await tester.pump();
    await tester.pump();

    expect(find.text(_es.readyTitle), findsNothing);
    expect(find.text(groupCode(code)), findsOneWidget);
    expect(find.text('Medellín'), findsOneWidget);
  });

  testWidgets(
    'deny asks for confirmation, blocks the attempt and shows notice',
    (tester) async {
      final repo = _repository(initial: _challenge);
      await _pumpScreen(tester, repo);
      await tester.pump();

      await tester.tap(find.text(_es.denyButton));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text(_es.denyDialogTitle), findsOneWidget);

      await tester.tap(find.text(_es.denyConfirm));
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump();

      expect(find.text(_es.denyDialogTitle), findsNothing);
      expect(find.text(_es.blockedTitle), findsOneWidget);
      expect(find.text(_es.blockedBody), findsOneWidget);
      expect(find.text(_es.readyTitle), findsOneWidget);
    },
  );

  testWidgets('cancelling the dialog keeps the challenge pending', (
    tester,
  ) async {
    final repo = _repository(initial: _challenge);
    final code = await repo.autoCode(_challenge.id);
    await _pumpScreen(tester, repo);
    await tester.pump();

    await tester.tap(find.text(_es.denyButton));
    await tester.pump(const Duration(milliseconds: 300));
    // Shared word from the i18n package.
    await tester.tap(find.text('Cancelar'));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text(groupCode(code)), findsOneWidget);
    expect(find.text(_es.blockedTitle), findsNothing);
  });

  testWidgets('dispose cancels the stream subscription and the ticker', (
    tester,
  ) async {
    final repo = _TrackingRepository();
    await _pumpScreen(tester, repo);
    repo.emit(_challenge);
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    expect(repo.hasListener, isTrue);

    // Removing the screen disposes its state. A ticker still running would
    // fail the test with a pending timer, and a leftover subscription would
    // keep the source listened to.
    await tester.pumpWidget(const SizedBox());
    expect(repo.hasListener, isFalse);

    await tester.pump(const Duration(seconds: 5));
  });

  testWidgets('scope disposal closes the repository', (tester) async {
    final services = DefaultShellServices(
      session: UserSession.anonymous(),
      eventBus: ShellEventBus(),
    );
    final scope = MicrofrontendScope(services);
    final screen = buildVerifierScreen(scope) as VerifierScreen;

    await scope.dispose();
    // A closed repository rejects further pushes.
    final repository = screen.repository as FakeVerifierRepository;
    expect(() => repository.push(_challenge), throwsStateError);
  });
}
