import 'package:contracts/contracts.dart' show ClientPlatform, SessionSummary;
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/sessions_controller.dart';
import 'package:mf_account/src/shared/enums/account_enums.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/recording_step_up.dart';
import '../utils/scripted_account_repository.dart';
import '../utils/test_app.dart';

SessionSummary _session(String id, {bool current = false}) => SessionSummary(
  id: id,
  deviceName: id,
  platform: ClientPlatform.web,
  lastSeenAt: DateTime.utc(2026, 1, 1),
  current: current,
);

void main() {
  group(SessionsController, () {
    test('starts loading and then shows the three sample sessions', () async {
      final repository = FakeAccountRepository();
      final controller = SessionsController(
        repository,
        stepUp: testStepUpGate(),
      );
      addTearDown(controller.dispose);

      expect(controller.sessions, isA<AsyncLoading<List<SessionSummary>>>());
      await controller.start();

      expect(controller.sessions, isA<AsyncData<List<SessionSummary>>>());
      expect(controller.sessions.valueOrNull, hasLength(3));
    });

    test('a failed listing becomes an error and a retry loads it', () async {
      final behavior = DemoBehavior()
        ..failNext(
          const FakeFailure(),
          operation: AccountOperation.listSessions,
        );
      final repository = FakeAccountRepository(behavior: behavior);
      final controller = SessionsController(
        repository,
        stepUp: testStepUpGate(),
      );
      addTearDown(controller.dispose);

      await controller.start();
      expect(controller.sessions, isA<AsyncError<List<SessionSummary>>>());

      await controller.start();
      expect(controller.sessions.valueOrNull, hasLength(3));
    });

    test('closing one session removes it from the list', () async {
      final repository = FakeAccountRepository();
      final controller = SessionsController(
        repository,
        stepUp: testStepUpGate(),
      );
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.closeSession(
        FakeAccountRepository.sampleSessionIds[1],
      );

      expect(result, isA<ActionSucceeded<void>>());
      await pumpEventQueue();
      expect(controller.sessions.valueOrNull, hasLength(2));
    });

    test('a failed close keeps the session in the list', () async {
      final behavior = DemoBehavior()
        ..failNext(
          const FakeFailure(),
          operation: AccountOperation.revokeSession,
        );
      final repository = FakeAccountRepository(behavior: behavior);
      final controller = SessionsController(
        repository,
        stepUp: testStepUpGate(),
      );
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.closeSession(
        FakeAccountRepository.sampleSessionIds[1],
      );

      expect(result, isA<ActionFailed<void>>());
      await pumpEventQueue();
      expect(controller.sessions.valueOrNull, hasLength(3));
    });

    test(
      'closing others with a fresh second factor skips the step-up',
      () async {
        final repository = FakeAccountRepository();
        final stepUp = RecordingStepUp();
        final controller = SessionsController(
          repository,
          stepUp: testStepUpGate(
            session: testSession(mfaFresh: true),
            request: stepUp.call,
          ),
        );
        addTearDown(controller.dispose);
        await controller.start();

        final result = await controller.closeOthers();

        expect(
          result,
          isA<ActionSucceeded<int>>().having((r) => r.value, 'value', 2),
        );
        expect(stepUp.calls, 0);
      },
    );

    test('closing others is skipped when the step-up is declined', () async {
      final repository = FakeAccountRepository();
      final stepUp = RecordingStepUp(answer: false);
      final controller = SessionsController(
        repository,
        stepUp: testStepUpGate(request: stepUp.call),
      );
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.closeOthers();

      expect(result, isA<ActionSkipped<int>>());
      expect(stepUp.calls, 1);
      expect(controller.sessions.valueOrNull, hasLength(3));
    });

    test(
      'closing others after the step-up closes the other sessions',
      () async {
        final repository = FakeAccountRepository();
        final stepUp = RecordingStepUp();
        final controller = SessionsController(
          repository,
          stepUp: testStepUpGate(request: stepUp.call),
        );
        addTearDown(controller.dispose);
        await controller.start();

        final result = await controller.closeOthers();

        expect(
          result,
          isA<ActionSucceeded<int>>().having((r) => r.value, 'value', 2),
        );
        expect(stepUp.calls, 1);
        await pumpEventQueue();
        expect(controller.sessions.valueOrNull, hasLength(1));
      },
    );

    test('an older listing never replaces a newer one', () async {
      final repository = ScriptedAccountRepository();
      final controller = SessionsController(
        repository,
        stepUp: testStepUpGate(),
      );
      addTearDown(controller.dispose);

      final first = controller.start();
      final closing = await controller.closeSession('x');
      expect(closing, isA<ActionSucceeded<void>>());
      await pumpEventQueue();
      expect(repository.listings, hasLength(2));

      repository.listings[1].complete([_session('new', current: true)]);
      repository.listings[0].complete([
        _session('old-1', current: true),
        _session('old-2'),
        _session('old-3'),
      ]);
      await first;
      await pumpEventQueue();

      expect(controller.sessions.valueOrNull?.map((s) => s.id), ['new']);
    });
  });
}
