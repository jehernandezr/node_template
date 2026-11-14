import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

import '../utils/pump.dart';

void main() {
  group('context.localeTag', () {
    testWidgets('gives the Spanish language tag', (tester) async {
      String? tag;
      await pumpApp(
        tester,
        Builder(
          builder: (context) {
            tag = context.localeTag;
            return const SizedBox();
          },
        ),
      );
      expect(tag, 'es');
    });

    testWidgets('gives the English language tag', (tester) async {
      String? tag;
      await pumpApp(
        tester,
        Builder(
          builder: (context) {
            tag = context.localeTag;
            return const SizedBox();
          },
        ),
        locale: const Locale('en'),
      );
      expect(tag, 'en');
    });
  });
}
