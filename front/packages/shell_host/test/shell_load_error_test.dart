import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:shell_host/shell_host.dart';

void main() {
  group(ShellLoadError, () {
    testWidgets(
      'as the loader errorBuilder it shows a localized error and retries',
      (tester) async {
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
            home: DeferredLibraryLoader(errorBuilder: ShellLoadError.builder)
                .page(
                  loadLibrary: loadLibrary,
                  builder: () => const Text('screen'),
                ),
          ),
        );
        await tester.pumpAndSettle();

        final l10n = lookupAppLocalizations(const Locale('es'));
        expect(find.byType(ShellLoadError), findsOneWidget);
        expect(find.text(l10n.errorFallback), findsOneWidget);
        expect(find.textContaining('network down'), findsNothing);
        expect(find.text('screen'), findsNothing);

        await tester.tap(find.text(l10n.actionRetry));
        await tester.pumpAndSettle();

        expect(attempts, 2);
        expect(find.text('screen'), findsOneWidget);
      },
    );
  });
}
