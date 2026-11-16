import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

void main() {
  group(AsyncValue, () {
    test('fromSnapshot maps each snapshot state', () {
      expect(
        AsyncValue<int>.fromSnapshot(const AsyncSnapshot.waiting()),
        isA<AsyncLoading<int>>(),
      );
      expect(
        AsyncValue<int>.fromSnapshot(
          const AsyncSnapshot.withData(ConnectionState.done, 1),
        ).valueOrNull,
        1,
      );
      expect(
        AsyncValue<int>.fromSnapshot(
          const AsyncSnapshot.withError(ConnectionState.done, 'x'),
        ),
        isA<AsyncError<int>>(),
      );
      expect(
        AsyncValue<int?>.fromSnapshot(
          const AsyncSnapshot<int?>.withData(ConnectionState.done, null),
        ),
        isA<AsyncData<int?>>(),
      );
    });

    test('guard returns the data of a successful load', () async {
      expect((await AsyncValue.guard(() async => 2)).valueOrNull, 2);
    });

    test('guard turns an Exception into AsyncError', () async {
      final failed = await AsyncValue.guard<int>(
        () async => throw Exception('offline'),
      );
      expect(failed, isA<AsyncError<int>>());
      expect(failed.isLoading, isFalse);
    });

    test('guard lets an Error escape', () {
      expect(
        AsyncValue.guard<int>(() async => throw StateError('bug')),
        throwsStateError,
      );
    });

    test('when runs the branch of the current state', () {
      String describe(AsyncValue<int> value) => value.when(
        loading: () => 'loading',
        data: (value) => 'data $value',
        error: (error) => 'error $error',
      );
      expect(describe(const AsyncValue.loading()), 'loading');
      expect(describe(const AsyncValue.data(4)), 'data 4');
      expect(describe(const AsyncValue.error('x')), 'error x');
    });
  });
}
