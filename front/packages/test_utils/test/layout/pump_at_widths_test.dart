import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  testWidgets('pumps each default width and checks it in order', (
    tester,
  ) async {
    final seen = <double>[];
    final checked = <double>[];

    await pumpAtWidths(
      tester,
      MaterialApp(
        home: LayoutBuilder(
          builder: (context, constraints) {
            seen.add(constraints.maxWidth);
            return const SizedBox();
          },
        ),
      ),
      check: (width) async {
        checked.add(tester.view.physicalSize.width);
      },
    );

    expect(checked, [320, 800, 1280]);
    expect(seen, containsAll([320, 800, 1280]));
  });

  testWidgets('checks only the widths it is given', (tester) async {
    final checked = <double>[];

    await pumpAtWidths(
      tester,
      const MaterialApp(home: SizedBox()),
      widths: const [400],
      check: (width) async {
        checked.add(width);
      },
    );

    expect(checked, [400]);
  });
}
