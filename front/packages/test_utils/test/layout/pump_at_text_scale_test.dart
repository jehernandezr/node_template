import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  testWidgets('uses a 2x text scale when none is given', (tester) async {
    late double scaled;

    await pumpAtTextScale(
      tester,
      MaterialApp(
        home: Builder(
          builder: (context) {
            scaled = MediaQuery.textScalerOf(context).scale(10);
            return const SizedBox();
          },
        ),
      ),
    );

    expect(scaled, 20);
  });

  testWidgets('applies the given text scale', (tester) async {
    late double scaled;

    await pumpAtTextScale(
      tester,
      MaterialApp(
        home: Builder(
          builder: (context) {
            scaled = MediaQuery.textScalerOf(context).scale(10);
            return const SizedBox();
          },
        ),
      ),
      scale: 3.0,
    );

    expect(scaled, 30);
  });
}
