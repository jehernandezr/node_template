import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../utils/pump.dart';

/// Pumps a button that runs [onTap] with its own context.
Future<void> _pumpButton(
  WidgetTester tester,
  void Function(BuildContext context) onTap,
) => pumpApp(
  tester,
  Builder(
    builder: (context) =>
        TextButton(onPressed: () => onTap(context), child: const Text('go')),
  ),
);

void main() {
  group('showActionResult', () {
    testWidgets('a success shows the success text and returns true', (
      tester,
    ) async {
      bool? shown;
      await _pumpButton(
        tester,
        (context) => shown = showActionResult(
          context,
          const ActionSucceeded<int>(1),
          success: 'Listo',
        ),
      );
      await tester.tap(find.text('go'));
      await tester.pump();

      expect(shown, isTrue);
      expect(find.text('Listo'), findsOneWidget);
    });

    testWidgets('a success without a success text shows nothing', (
      tester,
    ) async {
      bool? shown;
      await _pumpButton(
        tester,
        (context) =>
            shown = showActionResult(context, const ActionSucceeded<int>(1)),
      );
      await tester.tap(find.text('go'));
      await tester.pump();

      expect(shown, isFalse);
      expect(find.byType(SnackBar), findsNothing);
    });

    testWidgets('a failure shows the given failure text and returns true', (
      tester,
    ) async {
      bool? shown;
      await _pumpButton(
        tester,
        (context) => shown = showActionResult(
          context,
          ActionFailed<void>(Exception('x')),
          failure: 'No se pudo',
        ),
      );
      await tester.tap(find.text('go'));
      await tester.pump();

      expect(shown, isTrue);
      expect(find.text('No se pudo'), findsOneWidget);
    });

    testWidgets('a failure without a failure text uses the default message', (
      tester,
    ) async {
      await _pumpButton(
        tester,
        (context) => showActionResult(context, ActionFailed<void>(Object())),
      );
      await tester.tap(find.text('go'));
      await tester.pump();

      expect(find.text('Algo salió mal. Intenta de nuevo.'), findsOneWidget);
    });

    testWidgets('a skipped action shows nothing and returns false', (
      tester,
    ) async {
      bool? shown;
      await _pumpButton(
        tester,
        (context) => shown = showActionResult(
          context,
          const ActionSkipped<void>(),
          success: 'Listo',
          failure: 'No se pudo',
        ),
      );
      await tester.tap(find.text('go'));
      await tester.pump();

      expect(shown, isFalse);
      expect(find.byType(SnackBar), findsNothing);
    });

    testWidgets('does nothing once the context is unmounted', (tester) async {
      late BuildContext stale;
      await pumpApp(
        tester,
        Builder(
          builder: (context) {
            stale = context;
            return const SizedBox();
          },
        ),
      );
      await pumpApp(tester, const Text('otra pantalla'));

      final shown = showActionResult(
        stale,
        const ActionSucceeded<int>(1),
        success: 'tarde',
      );
      await tester.pump();

      expect(shown, isFalse);
      expect(find.byType(SnackBar), findsNothing);
    });
  });
}
