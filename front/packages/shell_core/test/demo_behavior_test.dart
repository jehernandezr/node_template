import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';

enum _Operation { fetch, save }

void main() {
  group(DemoBehavior, () {
    test('respond returns the computed value', () async {
      final behavior = DemoBehavior();

      expect(await behavior.respond(() => 1), 1);
    });

    testWidgets('respond waits the delay', (tester) async {
      final behavior = DemoBehavior(delay: const Duration(milliseconds: 100));
      var done = false;
      unawaited(behavior.respond(() => 1).then((_) => done = true));

      await tester.pump(const Duration(milliseconds: 99));
      expect(done, isFalse);

      await tester.pump(const Duration(milliseconds: 1));
      expect(done, isTrue);
    });

    test('failNext fails the next call and then recovers', () async {
      final behavior = DemoBehavior()..failNext(StateError('x'));

      await expectLater(behavior.respond(() => 1), throwsStateError);
      expect(await behavior.respond(() => 1), 1);
    });

    test('failNext with count fails that many calls', () async {
      final behavior = DemoBehavior()..failNext(StateError('x'), count: 2);

      await expectLater(behavior.respond(() => 1), throwsStateError);
      await expectLater(behavior.respond(() => 1), throwsStateError);
      expect(await behavior.respond(() => 1), 1);
    });

    test('failNext by operation only fails that operation', () async {
      final behavior = DemoBehavior()
        ..failNext(StateError('x'), operation: _Operation.save);

      expect(await behavior.respond(() => 1, operation: _Operation.fetch), 1);
      await expectLater(
        behavior.respond(() => 1, operation: _Operation.save),
        throwsStateError,
      );
    });

    test('a failure without operation applies to any call', () async {
      final behavior = DemoBehavior()..failNext(StateError('x'));

      await expectLater(
        behavior.respond(() => 1, operation: _Operation.fetch),
        throwsStateError,
      );
    });

    test('dispose makes later calls throw DemoDisposedException', () async {
      final behavior = DemoBehavior()..dispose();

      expect(behavior.isDisposed, isTrue);
      await expectLater(
        behavior.respond(() => 1),
        throwsA(isA<DemoDisposedException>()),
      );
    });

    testWidgets('a call pending at dispose throws DemoDisposedException', (
      tester,
    ) async {
      final behavior = DemoBehavior(delay: const Duration(milliseconds: 100));

      final future = behavior.respond(() => 1);
      final expectation = expectLater(
        future,
        throwsA(isA<DemoDisposedException>()),
      );
      behavior.dispose();
      await tester.pump(const Duration(milliseconds: 100));
      await expectation;
    });

    test('now reads the injected clock', () {
      final behavior = DemoBehavior(clock: () => DateTime.utc(2026, 1, 1));

      expect(behavior.now(), DateTime.utc(2026, 1, 1));
    });

    test('failNext rejects a count below one', () {
      final behavior = DemoBehavior();

      expect(
        () => behavior.failNext(StateError('x'), count: 0),
        throwsArgumentError,
      );
    });
  });
}
