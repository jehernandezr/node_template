import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

void main() {
  group(AsyncLoader, () {
    test('a new loader starts as loading', () {
      final loader = AsyncLoader<int>(() async => 1);
      addTearDown(loader.dispose);

      expect(loader.value, isA<AsyncLoading<int>>());
    });

    test('load stores the fetched value and notifies listeners', () async {
      final loader = AsyncLoader<int>(() async => 7);
      addTearDown(loader.dispose);
      var notifications = 0;
      loader.addListener(() => notifications++);

      await loader.load();

      expect(loader.value, isA<AsyncData<int>>());
      expect(loader.value.valueOrNull, 7);
      expect(notifications, greaterThanOrEqualTo(1));
    });

    test('an older answer never replaces a newer one', () async {
      final first = Completer<int>();
      final second = Completer<int>();
      var calls = 0;
      final loader = AsyncLoader<int>(
        () => ++calls == 1 ? first.future : second.future,
      );
      addTearDown(loader.dispose);

      final a = loader.load();
      final b = loader.load();
      second.complete(2);
      await b;
      first.complete(1);
      await a;

      expect(loader.value, isA<AsyncData<int>>());
      expect(loader.value.valueOrNull, 2);
    });

    test(
      'nothing notifies after dispose and the pending answer is dropped',
      () async {
        final gate = Completer<int>();
        final loader = AsyncLoader<int>(() => gate.future);
        var notifications = 0;
        loader.addListener(() => notifications++);

        final pending = loader.load();
        final before = notifications;
        loader.dispose();
        gate.complete(3);
        await pending;

        expect(notifications, before);
      },
    );

    test('setData replaces the data and drops a fetch in flight', () async {
      final gate = Completer<int>();
      final loader = AsyncLoader<int>(() => gate.future);
      addTearDown(loader.dispose);

      final pending = loader.load();
      loader.setData(5);
      gate.complete(9);
      await pending;

      expect(loader.value, isA<AsyncData<int>>());
      expect(loader.value.valueOrNull, 5);
    });

    test('keepCurrent keeps the data on screen while reloading', () async {
      final loaded = AsyncLoader<int>(() async => 4);
      addTearDown(loaded.dispose);
      await loaded.load();

      final seen = <AsyncValue<int>>[];
      loaded.addListener(() => seen.add(loaded.value));
      await loaded.load(keepCurrent: true);

      expect(seen.whereType<AsyncLoading<int>>(), isEmpty);
      expect(loaded.value.valueOrNull, 4);
    });

    test('keepCurrent without data goes through loading', () async {
      final loader = AsyncLoader<int>(() async => 4);
      addTearDown(loader.dispose);

      final seen = <AsyncValue<int>>[];
      loader.addListener(() => seen.add(loader.value));
      await loader.load(keepCurrent: true);

      expect(seen.first, isA<AsyncLoading<int>>());
      expect(loader.value.valueOrNull, 4);
    });

    test('load after dispose does not fetch', () async {
      var calls = 0;
      final loader = AsyncLoader<int>(() async => ++calls);
      loader.dispose();

      await loader.load();

      expect(calls, 0);
    });

    test('a fetch that throws an Exception leaves an error state', () async {
      final loader = AsyncLoader<int>(() async => throw Exception('x'));
      addTearDown(loader.dispose);

      await loader.load();

      expect(loader.value, isA<AsyncError<int>>());
    });

    test('an Error from the fetch escapes the load', () async {
      final loader = AsyncLoader<int>(() async => throw StateError('bug'));
      addTearDown(loader.dispose);

      await expectLater(loader.load(), throwsStateError);
    });
  });
}
