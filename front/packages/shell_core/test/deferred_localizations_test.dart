import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'utils/greeting_localizations.dart';
import 'utils/greeting_localizations_delegate.dart';

/// The app's default locale has the Material localizations the dialogs need.
Widget _app(WidgetBuilder page) => MaterialApp(
  home: DeferredLocalizations(
    delegates: [GreetingLocalizationsDelegate()],
    child: Builder(builder: page),
  ),
);

void main() {
  group(DeferredLocalizations, () {
    testWidgets('the page reads the delegate texts', (tester) async {
      await tester.pumpWidget(
        _app((context) => Text(GreetingLocalizations.of(context).greeting)),
      );

      expect(find.text('Hello'), findsOneWidget);
    });

    testWidgets('a dialog opened with showLocalizedDialog sees the delegate', (
      tester,
    ) async {
      await tester.pumpWidget(
        _app(
          (context) => TextButton(
            onPressed: () => context.showLocalizedDialog<void>(
              builder: (context) => AlertDialog(
                content: Text(GreetingLocalizations.of(context).greeting),
              ),
            ),
            child: const Text('open'),
          ),
        ),
      );

      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();

      expect(
        find.descendant(
          of: find.byType(AlertDialog),
          matching: find.text('Hello'),
        ),
        findsOneWidget,
      );
    });

    testWidgets('a sheet opened with showLocalizedSheet sees the delegate', (
      tester,
    ) async {
      await tester.pumpWidget(
        _app(
          (context) => TextButton(
            onPressed: () => context.showLocalizedSheet<void>(
              builder: (context) =>
                  Text(GreetingLocalizations.of(context).greeting),
            ),
            child: const Text('open'),
          ),
        ),
      );

      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();

      expect(find.text('Hello'), findsOneWidget);
    });

    testWidgets(
      'without DeferredLocalizations above, the helpers throw a clear FlutterError',
      (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Builder(
              builder: (context) => TextButton(
                onPressed: () => context.showLocalizedDialog<void>(
                  builder: (_) => const SizedBox(),
                ),
                child: const Text('open'),
              ),
            ),
          ),
        );

        await tester.tap(find.text('open'));
        await tester.pump();

        final error = tester.takeException();
        expect(error, isA<FlutterError>());
        expect(
          (error as FlutterError).message,
          contains('DeferredLocalizations'),
        );
      },
    );

    testWidgets('plain showDialog does not see the delegate', (tester) async {
      await tester.pumpWidget(
        _app(
          (context) => TextButton(
            onPressed: () => showDialog<void>(
              context: context,
              builder: (context) =>
                  Text(GreetingLocalizations.of(context).greeting),
            ),
            child: const Text('open'),
          ),
        ),
      );

      await tester.tap(find.text('open'));
      await tester.pump();

      expect(tester.takeException(), isNotNull);
    });
  });
}
