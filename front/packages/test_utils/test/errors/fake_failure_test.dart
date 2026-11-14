import 'package:flutter_test/flutter_test.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  group(FakeFailure, () {
    test('is caught by an `on Exception` handler', () {
      Object? caught;
      try {
        throw const FakeFailure();
      } on Exception catch (error) {
        caught = error;
      }

      expect(caught, isA<FakeFailure>());
    });

    test('shows its message in the test output', () {
      expect(const FakeFailure('offline').toString(), 'FakeFailure: offline');
    });
  });
}
