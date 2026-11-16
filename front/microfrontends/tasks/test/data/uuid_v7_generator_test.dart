import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:mf_tasks/src/data/uuid_v7_generator.dart';
import 'package:test_utils/test_utils.dart';

final RegExp _uuidV7 = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
);

/// The 48-bit timestamp of [id], as 12 hex digits.
String _timestamp(String id) => id.replaceAll('-', '').substring(0, 12);

String _hex48(DateTime time) =>
    time.millisecondsSinceEpoch.toRadixString(16).padLeft(12, '0');

void main() {
  test('ids have the UUIDv7 shape and start with the clock time', () {
    final clock = FakeClock();
    final ids = UuidV7Generator(clock: clock.now, random: Random(1));

    final id = ids.next();

    expect(id, matches(_uuidV7));
    expect(_timestamp(id), _hex48(clock.now()));
  });

  test('5000 ids in one millisecond are unique and strictly increasing', () {
    final clock = FakeClock();
    final ids = UuidV7Generator(clock: clock.now, random: Random(1));

    final generated = [for (var i = 0; i < 5000; i++) ids.next()];

    for (var i = 1; i < generated.length; i++) {
      expect(generated[i].compareTo(generated[i - 1]), greaterThan(0));
    }
    expect(generated.toSet(), hasLength(5000));
  });

  test('the counter overflows into the next millisecond', () {
    final clock = FakeClock();
    final ids = UuidV7Generator(clock: clock.now, random: Random(1));

    final generated = [for (var i = 0; i < 5000; i++) ids.next()];

    final nextMillisecond = clock.now().add(const Duration(milliseconds: 1));
    expect(generated.map(_timestamp), contains(_hex48(nextMillisecond)));
  });

  test('ids keep their order while the clock advances 1 ms at a time', () {
    final clock = FakeClock();
    final ids = UuidV7Generator(clock: clock.now, random: Random(1));

    final generated = <String>[];
    for (var i = 0; i < 100; i++) {
      clock.advance(const Duration(milliseconds: 1));
      generated.add(ids.next());
    }

    expect(generated, orderedEquals(([...generated]..sort())));
  });

  test('an id after the clock goes back is still greater than the last', () {
    final clock = FakeClock();
    final ids = UuidV7Generator(clock: clock.now, random: Random(1));
    final before = ids.next();

    clock.advance(const Duration(seconds: -1));
    final after = ids.next();

    expect(after.compareTo(before), greaterThan(0));
  });
}
