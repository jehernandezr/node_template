import 'package:test/test.dart';
import 'package:utils/utils.dart';

void main() {
  group('systemClock', () {
    test('returns a time between two readings of the wall clock', () {
      final before = DateTime.now();
      final value = systemClock();
      final after = DateTime.now();

      expect(value.isBefore(before), isFalse);
      expect(value.isAfter(after), isFalse);
    });

    test('returns local time, like the wall clock', () {
      expect(systemClock().isUtc, isFalse);
    });

    test('can be injected where a Clock is expected', () {
      const Clock clock = systemClock;

      expect(clock(), isA<DateTime>());
    });
  });
}
