import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

void main() {
  group(ActionRunner, () {
    test('a successful action returns its value', () async {
      final runner = ActionRunner();
      addTearDown(runner.dispose);

      final result = await runner.run(() async => 3);

      expect(
        result,
        isA<ActionSucceeded<int>>().having((r) => r.value, 'value', 3),
      );
    });

    test('an Exception becomes ActionFailed with the same error', () async {
      final runner = ActionRunner();
      addTearDown(runner.dispose);
      final error = Exception('x');

      final result = await runner.run<void>(() async => throw error);

      expect(
        result,
        isA<ActionFailed<void>>().having((r) => r.error, 'error', same(error)),
      );
    });

    test('an Error escapes and the runner is free again', () async {
      final runner = ActionRunner();
      addTearDown(runner.dispose);

      await expectLater(
        runner.run<void>(() async => throw StateError('bug')),
        throwsStateError,
      );
      expect(runner.isRunning, isFalse);
    });

    test('dropWhileRunning skips a call made while another one runs', () async {
      final runner = ActionRunner();
      addTearDown(runner.dispose);
      final gate = Completer<void>();

      final first = runner.run<void>(() => gate.future);
      final second = await runner.run<void>(() async {});
      expect(second, isA<ActionSkipped<void>>());

      gate.complete();
      await first;
      final third = await runner.run(() async => 'ok');
      expect(third, isA<ActionSucceeded<String>>());
    });

    test('serial runs each call after the previous one ends', () async {
      final runner = ActionRunner(concurrency: ActionConcurrency.serial);
      addTearDown(runner.dispose);
      final gate = Completer<void>();
      final log = <String>[];

      final first = runner.run<void>(() async {
        log.add('start 1');
        await gate.future;
        log.add('end 1');
      });
      final second = runner.run<void>(() async {
        log.add('start 2');
        log.add('end 2');
      });

      await Future<void>.value();
      await Future<void>.value();
      expect(log, ['start 1']);
      expect(runner.isRunning, isTrue);

      gate.complete();
      await Future.wait([first, second]);
      expect(log, ['start 1', 'end 1', 'start 2', 'end 2']);
      expect(runner.isRunning, isFalse);
    });

    test('serial keeps going after a call fails or throws an Error', () async {
      final runner = ActionRunner(concurrency: ActionConcurrency.serial);
      addTearDown(runner.dispose);

      final failed = runner.run<void>(() async => throw Exception('x'));
      final broken = runner.run<void>(() async => throw StateError('bug'));
      final next = runner.run(() async => 'ok');
      final escaped = expectLater(broken, throwsStateError);

      expect(await failed, isA<ActionFailed<void>>());
      await escaped;
      expect(
        await next,
        isA<ActionSucceeded<String>>().having((r) => r.value, 'value', 'ok'),
      );
      expect(runner.isRunning, isFalse);
    });

    test('parallel starts every call before any of them ends', () async {
      final runner = ActionRunner(concurrency: ActionConcurrency.parallel);
      addTearDown(runner.dispose);
      final gateOne = Completer<void>();
      final gateTwo = Completer<void>();
      final log = <String>[];

      final first = runner.run<void>(() async {
        log.add('start 1');
        await gateOne.future;
      });
      final second = runner.run<void>(() async {
        log.add('start 2');
        await gateTwo.future;
      });

      expect(log, ['start 1', 'start 2']);

      gateOne.complete();
      gateTwo.complete();
      await Future.wait([first, second]);
    });

    test('notifies once when the run starts and once when it ends', () async {
      final runner = ActionRunner();
      addTearDown(runner.dispose);
      var notifications = 0;
      runner.addListener(() => notifications++);

      await runner.run(() async => 1);

      expect(notifications, 2);
    });

    test('serial calls share one busy period in the notifications', () async {
      final runner = ActionRunner(concurrency: ActionConcurrency.serial);
      addTearDown(runner.dispose);
      var notifications = 0;
      runner.addListener(() => notifications++);

      await Future.wait([runner.run(() async => 1), runner.run(() async => 2)]);

      expect(notifications, 2);
    });

    test('dispose in the middle of an action does not throw', () async {
      final runner = ActionRunner();
      final gate = Completer<int>();

      final pending = runner.run(() => gate.future);
      runner.dispose();
      gate.complete(1);
      final result = await pending;

      expect(
        result,
        isA<ActionSucceeded<int>>().having((r) => r.value, 'value', 1),
      );
    });
  });
}
