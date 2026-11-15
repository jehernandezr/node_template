import 'package:contracts/contracts.dart' show DeviceSummary;
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_account/src/data/fake_account_repository.dart';
import 'package:mf_account/src/screens/devices_controller.dart';
import 'package:mf_account/src/shared/enums/account_enums.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/recording_step_up.dart';
import '../utils/test_app.dart';

final class _NoTrustRepository extends FakeAccountRepository {
  @override
  Set<AccountCapability> get capabilities => {AccountCapability.profile};
}

void main() {
  group(DevicesController, () {
    test('start loads the two sample devices', () async {
      final controller = DevicesController(
        FakeAccountRepository(),
        stepUp: testStepUpGate(),
      );
      addTearDown(controller.dispose);

      await controller.start();

      expect(controller.devices, isA<AsyncData<List<DeviceSummary>>>());
      expect(controller.devices.valueOrNull, hasLength(2));
    });

    test('a failed listing becomes an error', () async {
      final behavior = DemoBehavior()
        ..failNext(
          const FakeFailure(),
          operation: AccountOperation.listDevices,
        );
      final controller = DevicesController(
        FakeAccountRepository(behavior: behavior),
        stepUp: testStepUpGate(),
      );
      addTearDown(controller.dispose);

      await controller.start();

      expect(controller.devices, isA<AsyncError<List<DeviceSummary>>>());
    });

    test(
      'removing trust with a fresh second factor removes the device',
      () async {
        final controller = DevicesController(
          FakeAccountRepository(),
          stepUp: testStepUpGate(session: testSession(mfaFresh: true)),
        );
        addTearDown(controller.dispose);
        await controller.start();

        final result = await controller.removeTrust(
          FakeAccountRepository.sampleDeviceIds[0],
        );

        expect(result, isA<ActionSucceeded<void>>());
        await pumpEventQueue();
        expect(controller.devices.valueOrNull, hasLength(1));
      },
    );

    test('removing trust is skipped when the step-up is declined', () async {
      final stepUp = RecordingStepUp(answer: false);
      final controller = DevicesController(
        FakeAccountRepository(),
        stepUp: testStepUpGate(request: stepUp.call),
      );
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.removeTrust(
        FakeAccountRepository.sampleDeviceIds[0],
      );

      expect(result, isA<ActionSkipped<void>>());
      expect(stepUp.calls, 1);
      await pumpEventQueue();
      expect(controller.devices.valueOrNull, hasLength(2));
    });

    test('a failed removal reports ActionFailed', () async {
      final behavior = DemoBehavior()
        ..failNext(
          const FakeFailure(),
          operation: AccountOperation.removeDeviceTrust,
        );
      final controller = DevicesController(
        FakeAccountRepository(behavior: behavior),
        stepUp: testStepUpGate(session: testSession(mfaFresh: true)),
      );
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.removeTrust(
        FakeAccountRepository.sampleDeviceIds[0],
      );

      expect(result, isA<ActionFailed<void>>());
    });

    test('canRemoveTrust follows the repository capabilities', () {
      final full = DevicesController(
        FakeAccountRepository(),
        stepUp: testStepUpGate(),
      );
      addTearDown(full.dispose);
      final limited = DevicesController(
        _NoTrustRepository(),
        stepUp: testStepUpGate(),
      );
      addTearDown(limited.dispose);

      expect(full.canRemoveTrust, isTrue);
      expect(limited.canRemoveTrust, isFalse);
    });
  });
}
