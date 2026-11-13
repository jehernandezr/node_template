import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_verifier/src/data/fake_verifier_repository.dart';
import 'package:mf_verifier/src/data/verifier_repository.dart';
import 'package:mf_verifier/src/screens/verifier_screen.dart';
import 'package:mf_verifier/src/shared/types/login_challenge.dart';
import 'package:mf_verifier/src/shared/utils/verifier_codes.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import 'support.dart';

final VerifierLocalizations _es = l10nFor('es');

/// Mounts the real route with [repository] as the scope's repository.
Future<MicrofrontendScope> _pump(
  WidgetTester tester,
  VerifierRepository repository, {
  String language = 'es',
}) async {
  final scope = MicrofrontendScope(services());
  scope.get<VerifierRepository>((_) => repository);
  await tester.pumpWidget(routedApp(scope, language: language));
  await settle(tester);
  return scope;
}

/// Repository whose behavior each test controls.
final class _ControlledRepository implements VerifierRepository {
  final StreamController<LoginChallenge?> source =
      StreamController<LoginChallenge?>.broadcast();
  Future<String> Function(String id) onAutoCode = (_) async => '12345678';
  Future<void> Function(String id) onDeny = (_) async {};

  bool get hasListener => source.hasListener;

  @override
  Stream<LoginChallenge?> pending() => source.stream;

  @override
  Future<void> deny(String challengeId) => onDeny(challengeId);

  @override
  Future<String> autoCode(String challengeId) => onAutoCode(challengeId);

  @override
  void dispose() {
    unawaited(source.close());
  }
}

void main() {
  setUp(resetDeferredPageCache);

  group('utils', () {
    test('groupCode groups 8 digits as 4-4', () {
      expect(groupCode('12345678'), '1234 5678');
      expect(groupCode('123'), '123');
    });

    test('formatCountdown formats as mm:ss', () {
      expect(formatCountdown(150), '02:30');
      expect(formatCountdown(9), '00:09');
      expect(formatCountdown(-3), '00:00');
    });

    test('codeFromSignature yields a padded 8-digit code', () {
      expect(codeFromSignature([0, 0, 0, 1]), '00000001');
      expect(codeFromSignature([1, 2, 3, 4]), matches(RegExp(r'^\d{8}$')));
    });
  });

  group('l10n', () {
    test('es strings', () {
      expect(_es.title, 'Verificador');
      expect(_es.denyButton, 'No fui yo');
      expect(_es.expiresIn('02:30'), 'Caduca en 02:30');
    });

    test('en strings', () {
      final en = l10nFor('en');
      expect(en.title, 'Verifier');
      expect(en.denyButton, 'It was not me');
      expect(en.expiresIn('02:30'), 'Expires in 02:30');
    });

    testWidgets('the routed screen renders in en', (tester) async {
      await _pump(tester, fakeRepository(), language: 'en');

      expect(find.text('Verifier'), findsOneWidget);
      expect(find.text('This device is ready'), findsOneWidget);
    });
  });

  group('states', () {
    testWidgets('loading until the first event', (tester) async {
      await _pump(tester, _ControlledRepository());

      expect(find.byType(LoadingView), findsOneWidget);
      expect(find.text(_es.title), findsOneWidget);
    });

    testWidgets('error shows the localized message and retry resubscribes', (
      tester,
    ) async {
      final repo = _ControlledRepository();
      await _pump(tester, repo);

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
      final repo = fakeRepository(initial: challenge);
      final code = await repo.autoCode(challenge.id);
      await _pump(tester, repo);

      expect(find.text(groupCode(code)), findsOneWidget);
      expect(find.text('Chrome 128'), findsOneWidget);
      expect(find.text('Windows 11'), findsOneWidget);
      expect(find.text('Medellín'), findsOneWidget);
      expect(find.text('203.0.113.42'), findsOneWidget);
      expect(find.text(_es.denyButton), findsOneWidget);
      expect(find.text(_es.expiresIn('02:30')), findsOneWidget);
    });

    testWidgets('a failing code shows the localized failure', (tester) async {
      final repo = _ControlledRepository()
        ..onAutoCode = (_) async => throw StateError('no key');
      await _pump(tester, repo);

      repo.source.add(challenge);
      await settle(tester);

      expect(find.text(_es.codeFailed), findsOneWidget);
      expect(find.textContaining('no key'), findsNothing);
    });

    testWidgets('countdown expiry switches to the empty state', (tester) async {
      await _pump(tester, fakeRepository(initial: challenge));

      await tester.pump(const Duration(seconds: 1));
      expect(find.text(_es.expiresIn('02:29')), findsOneWidget);

      await tester.pump(const Duration(seconds: 149));
      expect(find.text(_es.readyTitle), findsOneWidget);
      expect(find.text(_es.denyButton), findsNothing);
    });

    testWidgets('no pending challenge shows the empty state', (tester) async {
      await _pump(tester, fakeRepository());

      expect(find.text(_es.readyTitle), findsOneWidget);
      expect(find.text(_es.readyMessage), findsOneWidget);
    });

    testWidgets('new challenge arriving via the stream is rendered', (
      tester,
    ) async {
      final repo = fakeRepository();
      final code = await repo.autoCode(challenge.id);
      await _pump(tester, repo);
      expect(find.text(_es.readyTitle), findsOneWidget);

      repo.push(challenge);
      await settle(tester);

      expect(find.text(_es.readyTitle), findsNothing);
      expect(find.text(groupCode(code)), findsOneWidget);
    });
  });

  group('deny', () {
    testWidgets('asks for confirmation, blocks and shows the notice', (
      tester,
    ) async {
      await _pump(tester, fakeRepository(initial: challenge));

      await tester.tap(find.text(_es.denyButton));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text(_es.denyDialogTitle), findsOneWidget);

      await tester.tap(find.text(_es.denyConfirm));
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump();

      expect(find.text(_es.denyDialogTitle), findsNothing);
      expect(find.text(_es.blockedTitle), findsOneWidget);
      expect(find.text(_es.readyTitle), findsOneWidget);
    });

    testWidgets('cancelling the dialog keeps the challenge pending', (
      tester,
    ) async {
      final repo = fakeRepository(initial: challenge);
      final code = await repo.autoCode(challenge.id);
      await _pump(tester, repo);

      await tester.tap(find.text(_es.denyButton));
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.text('Cancelar'));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text(groupCode(code)), findsOneWidget);
      expect(find.text(_es.blockedTitle), findsNothing);
    });

    testWidgets('an API error shows the localized snackbar', (tester) async {
      final repo = _ControlledRepository()
        ..onDeny = (_) async => throw const ContractViolationException(
          routeId: 'identity.deny',
          errors: [FieldError(code: 'invalid')],
        );
      await _pump(tester, repo);
      repo.source.add(challenge);
      await settle(tester);

      await tester.tap(find.text(_es.denyButton));
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.text(_es.denyConfirm));
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump();

      expect(find.text(_es.denyFailed), findsOneWidget);
      expect(find.text(_es.blockedTitle), findsNothing);
      expect(find.text(_es.denyButton), findsOneWidget);
    });
  });

  group('lifecycle', () {
    testWidgets('removing the screen cancels the subscription and ticker', (
      tester,
    ) async {
      final repo = _ControlledRepository();
      await _pump(tester, repo);
      repo.source.add(challenge);
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
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
      final first = MicrofrontendScope(services());
      scopeRepository(first).push(challenge);
      await tester.pumpWidget(routedApp(first));
      await settle(tester);
      expect(find.text('Medellín'), findsOneWidget);

      final second = MicrofrontendScope(services());
      await tester.pumpWidget(routedApp(second));
      await settle(tester);

      expect(find.text('Medellín'), findsNothing);
      expect(find.text(_es.readyTitle), findsOneWidget);
    });
  });
}

FakeVerifierRepository scopeRepository(MicrofrontendScope scope) =>
    (buildVerifierScreen(scope) as VerifierScreen).repository
        as FakeVerifierRepository;
