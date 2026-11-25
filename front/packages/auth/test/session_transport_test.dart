import 'package:auth/auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  group(SessionTransport, () {
    test('a store that cannot see the cookie uses the cookie transport', () {
      expect(
        SessionTransport.of(const CookieTokenStore()),
        SessionTransport.cookie,
      );
    });

    test('a store that keeps the session token uses the bearer transport', () {
      expect(
        SessionTransport.of(InMemoryTokenStore()),
        SessionTransport.bearer,
      );
      expect(SessionTransport.of(FakeTokenStore()), SessionTransport.bearer);
    });

    test('only the bearer transport declares itself', () {
      expect(SessionTransport.cookie.headers, isEmpty);
      expect(SessionTransport.bearer.headers, {
        'x-session-transport': 'bearer',
      });
    });
  });
}
