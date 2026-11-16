import 'package:flutter_test/flutter_test.dart';
import 'package:mf_verifier/src/shared/utils/verifier_codes.dart';

void main() {
  group('utils', () {
    test('groupCode groups 8 digits as 4-4', () {
      expect(groupCode('12345678'), '1234 5678');
      expect(groupCode('123'), '123');
    });

    test('formatCountdown formats as mm:ss', () {
      expect(formatCountdown(150), '02:30');
      expect(formatCountdown(9), '00:09');
      expect(formatCountdown(-3), '00:00');
    });

    test('codeFromSignature yields a padded 8-digit code', () {
      expect(codeFromSignature([0, 0, 0, 1]), '00000001');
      expect(codeFromSignature([1, 2, 3, 4]), matches(RegExp(r'^\d{8}$')));
    });

    test('spokenCode reads the digits one by one', () {
      expect(spokenCode('12345678'), '1 2 3 4 5 6 7 8');
    });
  });
}
