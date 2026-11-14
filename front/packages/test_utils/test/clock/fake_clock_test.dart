import 'package:flutter_test/flutter_test.dart';
import 'package:test_utils/test_utils.dart';
import 'package:utils/utils.dart';

void main() {
  group(FakeClock, () {
    test('starts at 2026-01-01 UTC by default', () {
      expect(FakeClock().now(), DateTime.utc(2026, 1, 1));
    });

    test('starts at the given time', () {
      final start = DateTime.utc(2030, 5, 6, 7);

      expect(FakeClock(start).now(), start);
    });

    testWidgets('does not move while time passes', (tester) async {
      final clock = FakeClock();
      final first = clock.now();

      await tester.pump(const Duration(hours: 1));

      expect(clock.now(), first);
    });

    test('advances by the given duration', () {
      final clock = FakeClock()..advance(const Duration(minutes: 90));

      expect(clock.now(), DateTime.utc(2026, 1, 1, 1, 30));
    });

    test('accumulates several advances', () {
      final clock = FakeClock()
        ..advance(const Duration(hours: 1))
        ..advance(const Duration(hours: 1));

      expect(clock.now(), DateTime.utc(2026, 1, 1, 2));
    });

    test('jumps to a given time', () {
      final clock = FakeClock()..set(DateTime.utc(2027, 3, 4));

      expect(clock.now(), DateTime.utc(2027, 3, 4));
    });

    test('keeps advancing from the time it jumped to', () {
      final clock = FakeClock()
        ..set(DateTime.utc(2027, 3, 4))
        ..advance(const Duration(days: 1));

      expect(clock.now(), DateTime.utc(2027, 3, 5));
    });

    test('is seen through a Clock tear-off after it moves', () {
      final fake = FakeClock();
      final Clock clock = fake.now;

      fake.advance(const Duration(days: 1));

      expect(clock(), DateTime.utc(2026, 1, 2));
    });
  });
}
