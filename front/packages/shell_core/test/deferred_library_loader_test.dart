import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

void main() {
  group(DeferredLibraryLoader, () {
    testWidgets(
      'loads a library once per instance, however many pages use it',
      (tester) async {
        final loader = DeferredLibraryLoader();
        final completer = Completer<void>();
        var loads = 0;
        Future<void> loadLibrary() {
          loads++;
          return completer.future;
        }

        await tester.pumpWidget(
          Directionality(
            textDirection: TextDirection.ltr,
            child: Column(
              children: [
                loader.page(
                  loadLibrary: loadLibrary,
                  builder: () => const Text('screen A'),
                  loading: const Text('loading'),
                ),
                loader.page(
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
        expect(loads, 1);
      },
    );

    test('a failed load is retried', () async {
      final loader = DeferredLibraryLoader();
      var attempts = 0;
      Future<void> loadLibrary() async {
        attempts++;
        if (attempts == 1) throw StateError('down');
      }

      await expectLater(loader.load(loadLibrary), throwsStateError);
      await pumpEventQueue();
      await loader.load(loadLibrary);

      expect(attempts, 2);
    });

    test('two instances do not share the cache', () async {
      var loads = 0;
      Future<void> loadLibrary() async {
        loads++;
      }

      await DeferredLibraryLoader().load(loadLibrary);
      await DeferredLibraryLoader().load(loadLibrary);
      expect(loads, 2);

      final loader = DeferredLibraryLoader();
      await loader.load(loadLibrary);
      await loader.load(loadLibrary);
      expect(loads, 3, reason: 'one instance loads the library once');
    });

    testWidgets('a page shows the loader loading view, then the content', (
      tester,
    ) async {
      final loader = DeferredLibraryLoader(
        loading: const Text('shell loading'),
      );
      final completer = Completer<void>();

      await tester.pumpWidget(
        Directionality(
          textDirection: TextDirection.ltr,
          child: loader.page(
            loadLibrary: () => completer.future,
            builder: () => const Text('content'),
          ),
        ),
      );
      expect(find.text('shell loading'), findsOneWidget);

      completer.complete();
      await tester.pumpAndSettle();

      expect(find.text('shell loading'), findsNothing);
      expect(find.text('content'), findsOneWidget);
    });

    testWidgets(
      'a page with its own loading view does not show the loader one',
      (tester) async {
        final loader = DeferredLibraryLoader(
          loading: const Text('shell loading'),
        );
        final completer = Completer<void>();

        await tester.pumpWidget(
          Directionality(
            textDirection: TextDirection.ltr,
            child: loader.page(
              loadLibrary: () => completer.future,
              builder: () => const Text('content'),
              loading: const Text('own loading'),
            ),
          ),
        );

        expect(find.text('own loading'), findsOneWidget);
        expect(find.text('shell loading'), findsNothing);

        completer.complete();
        await tester.pumpAndSettle();
      },
    );

    testWidgets(
      'a failed load shows the loader errorBuilder and its retry loads again',
      (tester) async {
        var attempts = 0;
        Future<void> loadLibrary() async {
          attempts++;
          if (attempts == 1) throw StateError('down');
        }

        final loader = DeferredLibraryLoader(
          errorBuilder: (error, retry) =>
              TextButton(onPressed: retry, child: const Text('try again')),
        );

        await tester.pumpWidget(
          Directionality(
            textDirection: TextDirection.ltr,
            child: loader.page(
              loadLibrary: loadLibrary,
              builder: () => const Text('content'),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('try again'), findsOneWidget);

        await tester.tap(find.text('try again'));
        await tester.pumpAndSettle();

        expect(attempts, 2);
        expect(find.text('content'), findsOneWidget);
      },
    );

    testWidgets('the default error view appears without localizations', (
      tester,
    ) async {
      var attempts = 0;
      Future<void> loadLibrary() async {
        attempts++;
        if (attempts == 1) throw StateError('down');
      }

      final loader = DeferredLibraryLoader();

      await tester.pumpWidget(
        Directionality(
          textDirection: TextDirection.ltr,
          child: loader.page(
            loadLibrary: loadLibrary,
            builder: () => const Text('content'),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byIcon(Icons.refresh), findsOneWidget);

      await tester.tap(find.byIcon(Icons.refresh));
      await tester.pumpAndSettle();

      expect(find.text('content'), findsOneWidget);
    });
  });
}
