import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  group(FakeTokenStore, () {
    late FakeTokenStore store;

    setUp(() => store = FakeTokenStore());

    test('keeps the written session token until it is cleared', () async {
      await store.writeSessionToken('session-1');

      expect(await store.readSessionToken(), 'session-1');
      expect(store.writeCount, 1);

      await store.clear();

      expect(await store.readSessionToken(), isNull);
    });

    test('holds a write while its gate is open', () async {
      final gate = Completer<void>();
      store.writeGate = gate;

      final write = store.writeSessionToken('session-2');
      await pumpEventQueue();

      expect(store.sessionToken, isNull);

      gate.complete();
      await write;

      expect(store.sessionToken, 'session-2');
    });
  });
}
