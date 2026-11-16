import 'package:flutter_test/flutter_test.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/security_controller.dart';
import 'package:mf_account/src/shared/enums/account_enums.dart';
import 'package:mf_account/src/shared/types/account_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/recording_step_up.dart';
import '../utils/test_app.dart';

void main() {
  group(SecurityController, () {
    test('loads the second factor and the passkeys', () async {
      final controller = SecurityController(
        FakeAccountRepository(),
        stepUp: testStepUpGate(),
      );
      addTearDown(controller.dispose);

      await controller.start();

      final overview = controller.overview.valueOrNull!;
      expect(overview.passkeys, hasLength(1));
      expect(overview.mfa.enabled, isTrue);
    });

    test('a failed load is an error, and a later start recovers', () async {
      final behavior = DemoBehavior()
        ..failNext(
          const FakeFailure(),
          operation: AccountOperation.loadSecurity,
        );
      final controller = SecurityController(
        FakeAccountRepository(behavior: behavior),
        stepUp: testStepUpGate(),
      );
      addTearDown(controller.dispose);

      await controller.start();
      expect(controller.overview, isA<AsyncError<SecurityOverview>>());

      await controller.start();
      expect(controller.overview.valueOrNull, isNotNull);
    });

    test('adding a passkey after a step-up reloads the passkeys', () async {
      final stepUp = RecordingStepUp();
      final controller = SecurityController(
        FakeAccountRepository(),
        stepUp: testStepUpGate(
          session: testSession(mfaFresh: true),
          request: stepUp.call,
        ),
      );
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.addPasskey();
      await pumpEventQueue();

      expect(result, isA<ActionSucceeded<void>>());
      expect(stepUp.calls, 0);
      expect(controller.overview.valueOrNull!.passkeys, hasLength(2));
    });

    test('a declined step-up skips adding a passkey', () async {
      final stepUp = RecordingStepUp(answer: false);
      final controller = SecurityController(
        FakeAccountRepository(),
        stepUp: testStepUpGate(request: stepUp.call),
      );
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.addPasskey();
      await pumpEventQueue();

      expect(result, isA<ActionSkipped<void>>());
      expect(stepUp.calls, 1);
      expect(controller.overview.valueOrNull!.passkeys, hasLength(1));
    });

    test(
      'regenerating with a fresh second factor returns eight codes',
      () async {
        final controller = SecurityController(
          FakeAccountRepository(),
          stepUp: testStepUpGate(session: testSession(mfaFresh: true)),
        );
        addTearDown(controller.dispose);

        final result = await controller.regenerateCodes();

        expect(result, isA<ActionSucceeded<List<String>>>());
        final codes = (result as ActionSucceeded<List<String>>).value;
        expect(codes, hasLength(8));
        expect(codes.first, 'AB100-CD200');
      },
    );

    test('a failed regeneration is an action failure', () async {
      final behavior = DemoBehavior()
        ..failNext(
          const FakeFailure(),
          operation: AccountOperation.regenerateRecoveryCodes,
        );
      final controller = SecurityController(
        FakeAccountRepository(behavior: behavior),
        stepUp: testStepUpGate(session: testSession(mfaFresh: true)),
      );
      addTearDown(controller.dispose);

      final result = await controller.regenerateCodes();

      expect(result, isA<ActionFailed<List<String>>>());
    });

    test('a declined step-up skips regenerating the codes', () async {
      final controller = SecurityController(
        FakeAccountRepository(),
        stepUp: testStepUpGate(request: RecordingStepUp(answer: false).call),
      );
      addTearDown(controller.dispose);

      final result = await controller.regenerateCodes();

      expect(result, isA<ActionSkipped<List<String>>>());
    });
  });
}
