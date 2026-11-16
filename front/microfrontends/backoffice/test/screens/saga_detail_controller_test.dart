import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/screens/saga_detail_controller.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:mf_backoffice/src/shared/types/backoffice_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/gated_backoffice_repository.dart';

void main() {
  late FakeClock clock;
  late DemoBehavior behavior;
  late FakeBackofficeRepository fake;

  setUp(() {
    clock = FakeClock(DateTime.utc(2026, 11, 15, 12));
    behavior = DemoBehavior(clock: clock.now);
    fake = FakeBackofficeRepository(behavior: behavior);
  });

  group(SagaDetailController, () {
    test('loads the saga and its audit log in parallel', () async {
      final gated = GatedBackofficeRepository(fake);
      final sagaGate = gated.holdNext(BackofficeOperation.saga);
      final auditGate = gated.holdNext(BackofficeOperation.sagaAudit);
      final controller = SagaDetailController(gated, sagaId: 's-102');
      addTearDown(controller.dispose);

      unawaited(controller.start());
      await pumpEventQueue();

      expect(gated.started, [
        BackofficeOperation.saga,
        BackofficeOperation.sagaAudit,
      ]);

      sagaGate.complete();
      auditGate.complete();
      await pumpEventQueue();

      final data = (controller.detail as AsyncData<SagaWithAudit>).value;
      expect(data.saga?.id, 's-102');
    });

    test('an unknown saga loads with a null saga', () async {
      final controller = SagaDetailController(fake, sagaId: 's-999');
      addTearDown(controller.dispose);

      await controller.start();

      final data = (controller.detail as AsyncData<SagaWithAudit>).value;
      expect(data.saga, isNull);
    });

    test('applying a valid action completes the saga and audits it', () async {
      final controller = SagaDetailController(fake, sagaId: 's-102');
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.apply(
        SagaManualAction.markResolved,
        'ok',
      );

      expect(result, isA<ActionSucceeded<void>>());
      final data = (controller.detail as AsyncData<SagaWithAudit>).value;
      expect(data.saga?.status, SagaStatus.completed);
      expect(data.audit.first.detail, 'ok');
      expect(data.audit.first.occurredAt, clock.now());
    });

    test(
      'a blank reason fails with validation required and keeps the data',
      () async {
        final controller = SagaDetailController(fake, sagaId: 's-102');
        addTearDown(controller.dispose);
        await controller.start();

        final result = await controller.apply(
          SagaManualAction.markResolved,
          '   ',
        );

        expect(result, isA<ActionFailed<void>>());
        final error = (result as ActionFailed<void>).error;
        expect(error, isA<ApiErrorException>());
        expect(
          (error as ApiErrorException).problem.code,
          PlatformErrorCode.validationRequired.code,
        );
        expect(controller.detail, isA<AsyncData<SagaWithAudit>>());
      },
    );

    test('a scheduled failure of the action gives ActionFailed', () async {
      behavior.failNext(
        ApiErrorException(ProblemFixtures.unavailable()),
        operation: BackofficeOperation.applySagaAction,
      );
      final controller = SagaDetailController(fake, sagaId: 's-102');
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.apply(
        SagaManualAction.retryStep,
        'reintento',
      );

      expect(result, isA<ActionFailed<void>>());
    });

    test('a second action while one runs is skipped', () async {
      final gated = GatedBackofficeRepository(fake);
      final gate = gated.holdNext(BackofficeOperation.applySagaAction);
      final controller = SagaDetailController(gated, sagaId: 's-102');
      addTearDown(controller.dispose);
      await controller.start();

      final first = controller.apply(SagaManualAction.retryStep, 'primero');

      expect(controller.isBusy, isTrue);
      final second = await controller.apply(
        SagaManualAction.markResolved,
        'segundo',
      );
      expect(second, isA<ActionSkipped<void>>());

      gate.complete();
      expect(await first, isA<ActionSucceeded<void>>());
      expect(controller.isBusy, isFalse);
    });

    test('disposing before a held action finishes does not throw', () async {
      final gated = GatedBackofficeRepository(fake);
      final gate = gated.holdNext(BackofficeOperation.applySagaAction);
      final controller = SagaDetailController(gated, sagaId: 's-102');
      await controller.start();

      final pending = controller.apply(SagaManualAction.retryStep, 'motivo');
      controller.dispose();
      gate.complete();

      await pending;
    });
  });
}
