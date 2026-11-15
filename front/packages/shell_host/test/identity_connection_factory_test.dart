import 'package:flutter_test/flutter_test.dart';
import 'package:shell_host/src/identity_connection_factory.dart';
import 'package:test_utils/test_utils.dart';

import 'utils/scripted_transport.dart';

void main() {
  group('IdentityConnectionFactory', () {
    test('an empty base URL is demo mode: no connection, nothing built', () {
      var transports = 0;
      var stores = 0;
      final factory = IdentityConnectionFactory(
        baseUrl: '',
        transport: () {
          transports++;
          return ScriptedTransport.unavailable();
        },
        tokenStore: () {
          stores++;
          return FakeTokenStore();
        },
      );

      expect(factory.create(), isNull);
      expect(transports, 0);
      expect(stores, 0);
    });

    test('a base URL builds one connection that owns its transport', () async {
      var transports = 0;
      var stores = 0;
      late ScriptedTransport transport;
      final factory = IdentityConnectionFactory(
        baseUrl: 'https://api.example.com',
        transport: () {
          transports++;
          return transport = ScriptedTransport.unavailable();
        },
        tokenStore: () {
          stores++;
          return FakeTokenStore();
        },
      );

      final connection = factory.create();
      expect(connection, isNotNull);
      expect(transports, 1);
      expect(stores, 1);

      await connection!.dispose();
      expect(transport.closed, isTrue);
    });
  });
}
