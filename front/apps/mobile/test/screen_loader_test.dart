import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mobile_shell/src/screen_loader.dart';
import 'package:shell_core/shell_core.dart';

void main() {
  setUp(resetDeferredPageCache);

  testWidgets('a failing load shows the localized error and retry recovers', (
    tester,
  ) async {
    var attempts = 0;
    Future<void> loadLibrary() async {
      attempts++;
      if (attempts == 1) throw StateError('network down');
    }

    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('es'),
        localizationsDelegates: [
          AppLocalizations.delegate,
          ...GlobalMaterialLocalizations.delegates,
        ],
        supportedLocales: supportedLocales,
        home: mobileScreenLoader(
          loadLibrary: loadLibrary,
          builder: () => const Text('screen'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(attempts, 1);
    expect(find.text('Algo salió mal. Intenta de nuevo.'), findsOneWidget);
    expect(find.text('Reintentar'), findsOneWidget);
    expect(find.text('screen'), findsNothing);

    await tester.tap(find.text('Reintentar'));
    await tester.pumpAndSettle();

    expect(attempts, 2);
    expect(find.text('screen'), findsOneWidget);
    expect(find.text('Algo salió mal. Intenta de nuevo.'), findsNothing);
  });
}
