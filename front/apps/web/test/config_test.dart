import 'package:auth/auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:web_shell/src/config.dart';

void main() {
  group('webIdentityConnection', () {
    test('without a base URL the shell runs in demo mode', () {
      expect(webIdentityConnection(''), isNull);
    });

    test('with a base URL it opens a connection with no session', () async {
      final connection = webIdentityConnection('https://api.example.com');
      try {
        expect(connection, isNotNull);
        expect(connection!.sessionManager.state, AuthState.signedOut);
      } finally {
        await connection?.dispose();
      }
    });
  });
}
