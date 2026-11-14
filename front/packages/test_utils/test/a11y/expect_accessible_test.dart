import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:test_utils/test_utils.dart';

Widget _button(double side) => Scaffold(
  body: Center(
    child: TextButton(
      onPressed: () {},
      style: TextButton.styleFrom(
        fixedSize: Size(side, side),
        minimumSize: Size.zero,
        padding: EdgeInsets.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: const Text('OK'),
    ),
  ),
);

void main() {
  testWidgets('passes a 48 px button', (tester) async {
    await const TestApp().pump(tester, _button(48));

    await expectAccessible(tester);
  });

  testWidgets('fails a 20 px button', (tester) async {
    await const TestApp().pump(tester, _button(20));

    await expectLater(expectAccessible(tester), throwsA(isA<TestFailure>()));
  });
}
