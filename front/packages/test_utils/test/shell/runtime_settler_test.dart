import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  testWidgets('settles work that needs the fake clock to move', (tester) async {
    final idle = await const RuntimeSettler().settle(
      tester,
      () => Future<void>.delayed(const Duration(milliseconds: 300)),
    );

    expect(idle, isTrue);
  });

  testWidgets('returns false when the work never ends', (tester) async {
    final never = Completer<void>();

    final idle = await const RuntimeSettler(rounds: 2)
        .settle(tester, () => never.future);

    expect(idle, isFalse);
  });
}
