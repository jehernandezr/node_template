import 'package:flutter_test/flutter_test.dart';

/// Runs the four tap-target and contrast guidelines on what is on screen.
/// The `finally` releases the semantics handle even when a guideline fails,
/// so the next test starts with the tree off.
Future<void> expectAccessible(WidgetTester tester) async {
  final handle = tester.ensureSemantics();
  try {
    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
    await expectLater(tester, meetsGuideline(textContrastGuideline));
  } finally {
    handle.dispose();
  }
}
