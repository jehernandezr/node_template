import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

void main() {
  setUp(resetDeferredPageCache);

  testWidgets('shows loading, then the builder; the library loads once', (
    tester,
  ) async {
    var loads = 0;
    final completer = Completer<void>();
    Future<void> loadLibrary() {
      loads++;
      return completer.future;
    }

    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: Column(
          children: [
            deferredPage(
              loadLibrary: loadLibrary,
              builder: () => const Text('screen A'),
              loading: const Text('loading'),
            ),
            deferredPage(
              loadLibrary: loadLibrary,
              builder: () => const Text('screen B'),
            ),
          ],
        ),
      ),
    );

    expect(find.text('loading'), findsOneWidget);
    expect(find.text('screen A'), findsNothing);
    expect(loads, 1);

    completer.complete();
    await tester.pumpAndSettle();

    expect(find.text('screen A'), findsOneWidget);
    expect(find.text('screen B'), findsOneWidget);
    expect(loads, 1, reason: 'a library loads once, however many pages use it');
  });

  testWidgets(
    'a failed load shows the default error view and Retry loads again',
    (tester) async {
      var attempts = 0;
      Future<void> loadLibrary() async {
        attempts++;
        if (attempts == 1) throw StateError('network down');
      }

      await tester.pumpWidget(
        Directionality(
          textDirection: TextDirection.ltr,
          child: deferredPage(
            loadLibrary: loadLibrary,
            builder: () => const Text('screen'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // The raw error never reaches the screen.
      expect(find.textContaining('network down'), findsNothing);
      expect(find.text('screen'), findsNothing);

      await tester.tap(find.byIcon(Icons.refresh));
      await tester.pumpAndSettle();

      expect(attempts, 2);
      expect(find.text('screen'), findsOneWidget);
    },
  );

  testWidgets('the default error view uses the localized texts', (
    tester,
  ) async {
    Future<void> loadLibrary() async => throw StateError('network down');

    await tester.pumpWidget(
      Localizations(
        locale: const Locale('en'),
        delegates: const [
          AppLocalizations.delegate,
          DefaultWidgetsLocalizations.delegate,
        ],
        child: Directionality(
          textDirection: TextDirection.ltr,
          child: deferredPage(
            loadLibrary: loadLibrary,
            builder: () => const Text('screen'),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final l10n = await AppLocalizations.delegate.load(const Locale('en'));
    expect(find.text(l10n.errorFallback), findsOneWidget);
    expect(find.text(l10n.actionRetry), findsOneWidget);
    expect(find.textContaining('network down'), findsNothing);
  });

  testWidgets('after a failed load and a reset, a new load runs', (
    tester,
  ) async {
    var attempts = 0;
    Future<void> loadLibrary() async {
      attempts++;
      if (attempts == 1) throw StateError('first try fails');
    }

    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: deferredPage(
          loadLibrary: loadLibrary,
          builder: () => const Text('screen'),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(attempts, 1);
    expect(find.byIcon(Icons.refresh), findsOneWidget);

    resetDeferredPageCache();
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: deferredPage(
          loadLibrary: loadLibrary,
          builder: () => const Text('screen'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(attempts, 2);
    expect(find.text('screen'), findsOneWidget);
  });

  testWidgets(
    'a load left pending by an earlier test is dropped by the reset',
    (tester) async {
      var calls = 0;
      final never = Completer<void>();
      Future<void> loadLibrary() {
        calls++;
        return never.future;
      }

      await tester.pumpWidget(
        Directionality(
          textDirection: TextDirection.ltr,
          child: deferredPage(
            loadLibrary: loadLibrary,
            builder: () => const Text('screen'),
          ),
        ),
      );
      expect(calls, 1);

      resetDeferredPageCache();
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpWidget(
        Directionality(
          textDirection: TextDirection.ltr,
          child: deferredPage(
            loadLibrary: loadLibrary,
            builder: () => const Text('screen'),
          ),
        ),
      );

      expect(
        calls,
        2,
        reason: 'without the reset the pending future would be reused',
      );
    },
  );

  testWidgets('errorBuilder receives the error and a working retry', (
    tester,
  ) async {
    var attempts = 0;
    Future<void> loadLibrary() async {
      attempts++;
      if (attempts == 1) throw StateError('boom');
    }

    Object? seen;
    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: deferredPage(
          loadLibrary: loadLibrary,
          builder: () => const Text('screen'),
          errorBuilder: (error, retry) {
            seen = error;
            return TextButton(onPressed: retry, child: const Text('try again'));
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(seen, isA<StateError>());
    await tester.tap(find.text('try again'));
    await tester.pumpAndSettle();

    expect(attempts, 2);
    expect(find.text('screen'), findsOneWidget);
  });
}
