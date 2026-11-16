import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_verifier/src/screens/verifier_controller.dart';
import 'package:mf_verifier/src/screens/verifier_state.dart';
import 'package:mf_verifier/src/shared/constants/verifier_constants.dart';
import 'package:mf_verifier/src/shared/types/login_challenge.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/controlled_verifier_repository.dart';
import '../utils/verifier_app.dart';

LoginChallenge _challenge(String id, {int seconds = 150}) => LoginChallenge(
  id: id,
  context: VerifierTestApp.loginChallenge.context,
  validFor: Duration(seconds: seconds),
);

VerifierChallenge _shown(VerifierController controller) =>
    controller.state as VerifierChallenge;

void main() {
  group(VerifierController, () {
    testWidgets('the countdown comes from expiresAt', (tester) async {
      final clock = FakeClock();
      final repo = ControlledVerifierRepository();
      final controller = VerifierController(repo, clock: clock.now);
      try {
        await controller.start();
        repo.source.add(VerifierTestApp.loginChallenge);
        await tester.pump();
        expect(_shown(controller).secondsLeft, 150);

        clock.advance(const Duration(seconds: 1));
        await tester.pump(verifierTick);
        expect(_shown(controller).secondsLeft, 149);
      } finally {
        controller.dispose();
        repo.dispose();
      }
    });

    testWidgets('a 30 s clock jump does not drift', (tester) async {
      final clock = FakeClock();
      final repo = ControlledVerifierRepository();
      final controller = VerifierController(repo, clock: clock.now);
      try {
        await controller.start();
        repo.source.add(VerifierTestApp.loginChallenge);
        await tester.pump();
        clock.advance(const Duration(seconds: 1));
        await tester.pump(verifierTick);
        expect(_shown(controller).secondsLeft, 149);

        clock.advance(const Duration(seconds: 30));
        await tester.pump(verifierTick);
        expect(_shown(controller).secondsLeft, 119);

        clock.advance(const Duration(seconds: 1));
        await tester.pump(verifierTick);
        expect(_shown(controller).secondsLeft, 118);
      } finally {
        controller.dispose();
        repo.dispose();
      }
    });

    testWidgets('expiry goes to VerifierWaiting(expired: true)', (
      tester,
    ) async {
      final clock = FakeClock();
      final repo = ControlledVerifierRepository();
      final controller = VerifierController(repo, clock: clock.now);
      try {
        await controller.start();
        repo.source.add(_challenge('short', seconds: 3));
        await tester.pump();

        clock.advance(const Duration(seconds: 3));
        await tester.pump(verifierTick);

        final state = controller.state;
        expect(state, isA<VerifierWaiting>());
        expect((state as VerifierWaiting).expired, isTrue);
      } finally {
        controller.dispose();
        repo.dispose();
      }
    });

    testWidgets(
      'a successful deny blocks and a new challenge resets the state',
      (tester) async {
        final clock = FakeClock();
        final repo = ControlledVerifierRepository();
        final controller = VerifierController(repo, clock: clock.now);
        try {
          await controller.start();
          repo.source.add(VerifierTestApp.loginChallenge);
          await tester.pump();
          controller.markCopied();

          final denial = Completer<void>();
          repo.onDeny = (_) => denial.future;
          final result = controller.deny();
          await tester.pump();
          expect(controller.state, isA<VerifierDenying>());
          denial.complete();
          expect(await result, isA<ActionSucceeded<void>>());
          await tester.pump();
          expect(controller.state, isA<VerifierBlocked>());

          repo.source.add(null);
          await tester.pump();
          expect(controller.state, isA<VerifierBlocked>());

          repo.onAutoCode = (_) => Completer<String>().future;
          repo.source.add(_challenge('next'));
          await tester.pump();
          expect(_shown(controller).copied, isFalse);
          expect(_shown(controller).code, isA<AsyncLoading<String>>());
        } finally {
          controller.dispose();
          repo.dispose();
        }
      },
    );

    testWidgets('copied goes back to false with the next challenge', (
      tester,
    ) async {
      final clock = FakeClock();
      final repo = ControlledVerifierRepository();
      final controller = VerifierController(repo, clock: clock.now);
      try {
        await controller.start();
        repo.source.add(VerifierTestApp.loginChallenge);
        await tester.pump();

        controller.markCopied();
        expect(_shown(controller).copied, isTrue);

        repo.source.add(_challenge('next'));
        await tester.pump();
        expect(_shown(controller).copied, isFalse);
      } finally {
        controller.dispose();
        repo.dispose();
      }
    });

    testWidgets(
      'a late autoCode of the previous challenge does not overwrite the new one',
      (tester) async {
        final clock = FakeClock();
        final repo = ControlledVerifierRepository();
        final completers = {'A': Completer<String>(), 'B': Completer<String>()};
        repo.onAutoCode = (id) => completers[id]!.future;
        final controller = VerifierController(repo, clock: clock.now);
        try {
          await controller.start();
          repo.source.add(_challenge('A'));
          await tester.pump();
          repo.source.add(_challenge('B'));
          await tester.pump();

          completers['B']!.complete('22222222');
          await tester.pump();
          completers['A']!.complete('11111111');
          await tester.pump();

          expect(_shown(controller).code.valueOrNull, '22222222');
        } finally {
          controller.dispose();
          repo.dispose();
        }
      },
    );

    testWidgets(
      'a failed deny returns ActionFailed and goes back to the challenge',
      (tester) async {
        final clock = FakeClock();
        final repo = ControlledVerifierRepository()
          ..onDeny = (_) async => throw const ContractViolationException(
            routeId: 'identity.deny',
            errors: [FieldError(code: 'invalid')],
          );
        final controller = VerifierController(repo, clock: clock.now);
        try {
          await controller.start();
          repo.source.add(VerifierTestApp.loginChallenge);
          await tester.pump();

          final result = controller.deny();
          expect(await result, isA<ActionFailed<void>>());
          await tester.pump();
          expect(controller.state, isA<VerifierChallenge>());

          clock.advance(const Duration(seconds: 1));
          await tester.pump(verifierTick);
          expect(_shown(controller).secondsLeft, 149);
        } finally {
          controller.dispose();
          repo.dispose();
        }
      },
    );

    testWidgets('a null event while denying is ignored', (tester) async {
      final clock = FakeClock();
      final repo = ControlledVerifierRepository();
      final denial = Completer<void>();
      repo.onDeny = (_) => denial.future;
      final controller = VerifierController(repo, clock: clock.now);
      try {
        await controller.start();
        repo.source.add(VerifierTestApp.loginChallenge);
        await tester.pump();

        final result = controller.deny();
        await tester.pump();
        repo.source.add(null);
        await tester.pump();
        expect(controller.state, isA<VerifierDenying>());

        denial.complete();
        expect(await result, isA<ActionSucceeded<void>>());
        await tester.pump();
        expect(controller.state, isA<VerifierBlocked>());
      } finally {
        controller.dispose();
        repo.dispose();
      }
    });

    testWidgets('a stream error goes to VerifierFailed and start recovers', (
      tester,
    ) async {
      final clock = FakeClock();
      final repo = ControlledVerifierRepository();
      final controller = VerifierController(repo, clock: clock.now);
      try {
        await controller.start();
        repo.source.addError(const FakeFailure());
        await tester.pump();
        expect(controller.state, isA<VerifierFailed>());

        await controller.start();
        expect(controller.state, isA<VerifierLoading>());

        repo.source.add(VerifierTestApp.loginChallenge);
        await tester.pump();
        expect(controller.state, isA<VerifierChallenge>());
      } finally {
        controller.dispose();
        repo.dispose();
      }
    });

    testWidgets('start twice keeps one subscription', (tester) async {
      final clock = FakeClock();
      final repo = ControlledVerifierRepository();
      final controller = VerifierController(repo, clock: clock.now);
      try {
        await controller.start();
        await controller.start();
        repo.source.add(VerifierTestApp.loginChallenge);
        await tester.pump();

        expect(repo.autoCodeCalls, 1);
      } finally {
        controller.dispose();
        repo.dispose();
      }
    });

    testWidgets('dispose cancels the subscription and the ticker', (
      tester,
    ) async {
      final clock = FakeClock();
      final repo = ControlledVerifierRepository();
      final controller = VerifierController(repo, clock: clock.now);
      await controller.start();
      repo.source.add(VerifierTestApp.loginChallenge);
      await tester.pump();

      var notifications = 0;
      controller.addListener(() => notifications++);
      controller.dispose();
      expect(repo.hasListener, isFalse);

      await tester.pump(const Duration(seconds: 5));
      expect(notifications, 0);
      repo.dispose();
    });
  });
}
