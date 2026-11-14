import 'package:flutter/foundation.dart' show SynchronousFuture;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

void main() {
  group(TestApp, () {
    testWidgets('localizes the app to the locale it was given', (tester) async {
      late BuildContext captured;
      final home = Builder(
        builder: (context) {
          captured = context;
          return const SizedBox();
        },
      );

      await const TestApp(locale: Locale('es')).pump(tester, home);
      final spanish = AppLocalizations.of(captured).loading;

      expect(spanish, lookupAppLocalizations(const Locale('es')).loading);

      await const TestApp(locale: Locale('en')).pump(tester, home);
      final english = AppLocalizations.of(captured).loading;

      expect(english, lookupAppLocalizations(const Locale('en')).loading);
      expect(english, isNot(spanish));
    });

    testWidgets('adds the delegates of the microfrontend under test', (
      tester,
    ) async {
      late BuildContext captured;
      final home = Builder(
        builder: (context) {
          captured = context;
          return const SizedBox();
        },
      );

      await const TestApp(delegates: [_ProbeDelegate()]).pump(tester, home);

      expect(
        Localizations.of<_ProbeLocalizations>(captured, _ProbeLocalizations),
        isNotNull,
      );
    });

    testWidgets('gives the app the session it was given', (tester) async {
      late BuildContext captured;
      final home = Builder(
        builder: (context) {
          captured = context;
          return const SizedBox();
        },
      );
      final session = SessionBuilder(userId: 'u2').build();

      await TestApp(session: session).pump(tester, home);

      expect(ShellAccessScope.of(captured).session.value, session);
    });

    testWidgets('gives a signed-in default session when none is given', (
      tester,
    ) async {
      late BuildContext captured;
      final home = Builder(
        builder: (context) {
          captured = context;
          return const SizedBox();
        },
      );

      await const TestApp().pump(tester, home);

      expect(
        ShellAccessScope.of(captured).session.value,
        SessionBuilder().build(),
      );
    });

    testWidgets('applies the light theme of the design system', (tester) async {
      late BuildContext captured;
      final home = Builder(
        builder: (context) {
          captured = context;
          return const SizedBox();
        },
      );

      await const TestApp().pump(tester, home);

      expect(
        Theme.of(captured).colorScheme.primary,
        AppTheme.light().colorScheme.primary,
      );
    });

    testWidgets('wrapRouter mounts the router home', (tester) async {
      final router = GoRouter(
        initialLocation: '/',
        routes: [GoRoute(path: '/', builder: (_, _) => const Text('home'))],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(const TestApp().wrapRouter(router));
      await tester.pump();

      expect(find.text('home'), findsOneWidget);
    });

    testWidgets('wrapRouter uses the locale and the delegates it was given', (
      tester,
    ) async {
      late BuildContext captured;
      final router = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(
            path: '/',
            builder: (context, _) {
              captured = context;
              return const SizedBox();
            },
          ),
        ],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(
        const TestApp(
          locale: Locale('en'),
          delegates: [_ProbeDelegate()],
        ).wrapRouter(router),
      );
      await tester.pump();

      expect(Localizations.localeOf(captured), const Locale('en'));
      expect(
        Localizations.of<_ProbeLocalizations>(captured, _ProbeLocalizations),
        isNotNull,
      );
    });

    testWidgets('gives the access scope the clock it was given', (
      tester,
    ) async {
      late BuildContext captured;
      final clock = FakeClock(DateTime.utc(2026, 3, 1));

      await TestApp(clock: clock.now).pump(
        tester,
        Builder(
          builder: (context) {
            captured = context;
            return const SizedBox();
          },
        ),
      );

      expect(ShellAccessScope.of(captured).clock(), DateTime.utc(2026, 3, 1));
    });

    testWidgets('pump leaves the home mounted', (tester) async {
      await const TestApp().pump(tester, const Text('x'));

      expect(find.text('x'), findsOneWidget);
    });
  });
}

final class _ProbeLocalizations {}

final class _ProbeDelegate extends LocalizationsDelegate<_ProbeLocalizations> {
  const _ProbeDelegate();

  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<_ProbeLocalizations> load(Locale locale) =>
      SynchronousFuture(_ProbeLocalizations());

  @override
  bool shouldReload(_ProbeDelegate old) => false;
}
