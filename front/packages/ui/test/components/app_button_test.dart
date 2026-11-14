import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui/ui.dart';

import '../utils/pump.dart';

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

  testWidgets('loading spinner is labeled with the loading text', (
    tester,
  ) async {
    await pumpApp(
      tester,
      AppButton(label: 'Submit', onPressed: () {}, loading: true),
    );
    expect(
      tester
          .widget<CircularProgressIndicator>(
            find.byType(CircularProgressIndicator),
          )
          .semanticsLabel,
      'Cargando',
    );
  });

  testWidgets('null onPressed disables the button', (tester) async {
    await pumpApp(tester, const AppButton(label: 'Off', onPressed: null));
    final button = tester.widget<FilledButton>(find.byType(FilledButton));
    expect(button.onPressed, isNull);
  });

  testWidgets('keeps a 48 pixel height even with a shrink-wrapped tap target', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light().copyWith(
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: Center(
            child: AppButton(label: 'Ok', onPressed: () {}),
          ),
        ),
      ),
    );
    expect(tester.getSize(find.byType(FilledButton)).height, 48);
  });
}
