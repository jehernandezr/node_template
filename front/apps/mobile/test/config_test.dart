import 'package:auth/auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_shell/src/config.dart';

void main() {
  group('mobileIdentityConnection', () {
    test('without a base URL the shell runs in demo mode', () {
      expect(mobileIdentityConnection(''), isNull);
    });

    test('with a base URL it opens a connection with no session', () async {
      final connection = mobileIdentityConnection('https://api.example.com');
      try {
        expect(connection, isNotNull);
        expect(connection!.sessionManager.state, AuthState.signedOut);
      } finally {
        await connection?.dispose();
      }
    });
  });
}
