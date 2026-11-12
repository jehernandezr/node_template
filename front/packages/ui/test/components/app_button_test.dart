import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

import '../support/pump.dart';

void main() {
  testWidgets('primary variant renders a FilledButton', (tester) async {
    await pumpApp(tester, AppButton(label: 'Save', onPressed: () {}));
    expect(find.widgetWithText(FilledButton, 'Save'), findsOneWidget);
  });

  testWidgets('secondary variant renders an OutlinedButton', (tester) async {
    await pumpApp(
      tester,
      AppButton(
        label: 'Cancel',
        onPressed: () {},
        variant: AppButtonVariant.secondary,
      ),
    );
    expect(find.widgetWithText(OutlinedButton, 'Cancel'), findsOneWidget);
  });

  testWidgets('danger variant uses the error color', (tester) async {
    await pumpApp(
      tester,
      AppButton(
        label: 'Delete',
        onPressed: () {},
        variant: AppButtonVariant.danger,
      ),
    );
    final button = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Delete'),
    );
    final scheme = Theme.of(tester.element(find.byType(FilledButton)))
        .colorScheme;
    expect(button.style?.backgroundColor?.resolve({}), scheme.error);
  });

  testWidgets('calls onPressed when tapped', (tester) async {
    var taps = 0;
    await pumpApp(tester, AppButton(label: 'Go', onPressed: () => taps++));
    await tester.tap(find.text('Go'));
    expect(taps, 1);
  });

  testWidgets('loading shows a spinner and blocks taps', (tester) async {
    var taps = 0;
    await pumpApp(
      tester,
      AppButton(label: 'Submit', onPressed: () => taps++, loading: true),
    );
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.tap(find.byType(FilledButton));
    expect(taps, 0);
  });

  testWidgets('null onPressed disables the button', (tester) async {
    await pumpApp(tester, const AppButton(label: 'Off', onPressed: null));
    final button = tester.widget<FilledButton>(find.byType(FilledButton));
    expect(button.onPressed, isNull);
  });
}
