import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_backoffice/src/data/fake_backoffice_repository.dart';
import 'package:mf_backoffice/src/screens/dlq_controller.dart';
import 'package:mf_backoffice/src/shared/enums/backoffice_enums.dart';
import 'package:mf_backoffice/src/shared/types/backoffice_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/gated_backoffice_repository.dart';

const _queue = 'notifications-tasks-events';

List<String> _queueNames(DlqController controller) => [
  for (final queue
      in controller.queues.valueOrNull ?? const <DeadLetterQueue>[])
    queue.name,
];

int _messageCount(DlqController controller) =>
    controller.messages?.valueOrNull?.length ?? -1;

void main() {
  late FakeClock clock;
  late DemoBehavior behavior;
  late FakeBackofficeRepository fake;
  late GatedBackofficeRepository gated;

  setUp(() {
    clock = FakeClock();
    behavior = DemoBehavior(clock: clock.now);
    fake = FakeBackofficeRepository(behavior: behavior);
    gated = GatedBackofficeRepository(fake);
  });

  group(DlqController, () {
    test('without a queue loads the queues and no messages', () async {
      final controller = DlqController(fake);
      addTearDown(controller.dispose);

      await controller.start();

      expect(controller.messages, isNull);
      expect(_queueNames(controller), [
        'notifications-tasks-events',
        'reports-commands',
        'billing-events',
      ]);
    });

    test('with a queue loads its three messages', () async {
      final controller = DlqController(fake, queue: _queue);
      addTearDown(controller.dispose);

      await controller.start();

      expect(_messageCount(controller), 3);
    });

    test('redrive without a queue is skipped', () async {
      final controller = DlqController(fake);
      addTearDown(controller.dispose);

      expect(await controller.redrive(), isA<ActionSkipped<int>>());
    });

    test('redrive moves the messages and reloads both lists', () async {
      final controller = DlqController(fake, queue: _queue);
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.redrive();

      expect(
        result,
        isA<ActionSucceeded<int>>().having((r) => r.value, 'value', 3),
      );
      expect(_messageCount(controller), 0);
      expect(
        controller.queues.valueOrNull?.firstWhere((q) => q.name == _queue),
        isA<DeadLetterQueue>().having((q) => q.messageCount, 'count', 0),
      );
    });

    test('redrive reloads the queues and the messages afterwards', () async {
      final controller = DlqController(gated, queue: _queue);
      addTearDown(controller.dispose);
      await controller.start();
      final before = gated.started.length;

      await controller.redrive();

      expect(
        gated.started.sublist(before),
        containsAll([
          BackofficeOperation.redrive,
          BackofficeOperation.deadLetterQueues,
          BackofficeOperation.deadLetterMessages,
        ]),
      );
    });

    test('a failed redrive reports the error and keeps the messages', () async {
      behavior.failNext(
        ApiErrorException(ProblemFixtures.unavailable()),
        operation: BackofficeOperation.redrive,
      );
      final controller = DlqController(fake, queue: _queue);
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.redrive();

      expect(result, isA<ActionFailed<int>>());
      expect(_messageCount(controller), 3);
    });

    test('a second redrive while one runs is skipped', () async {
      final gate = gated.holdNext(BackofficeOperation.redrive);
      final controller = DlqController(gated, queue: _queue);
      addTearDown(controller.dispose);
      await controller.start();

      final first = controller.redrive();
      await pumpEventQueue();

      expect(controller.isBusy, isTrue);
      expect(await controller.redrive(), isA<ActionSkipped<int>>());

      gate.complete();
      expect(await first, isA<ActionSucceeded<int>>());
      expect(controller.isBusy, isFalse);
    });

    test('reloadQueues loads only the queues', () async {
      final controller = DlqController(gated, queue: _queue);
      addTearDown(controller.dispose);
      await controller.start();
      final before = gated.started.length;

      await controller.reloadQueues();

      expect(gated.started.sublist(before), [
        BackofficeOperation.deadLetterQueues,
      ]);
    });

    test('disposing while a load is held does not throw', () async {
      final gate = gated.holdNext(BackofficeOperation.deadLetterQueues);
      final controller = DlqController(gated);
      unawaited(controller.start());
      await pumpEventQueue();

      controller.dispose();
      gate.complete();
      await pumpEventQueue();
    });
  });
}
