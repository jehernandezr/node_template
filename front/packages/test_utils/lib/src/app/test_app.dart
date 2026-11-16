import 'package:flutter_localizations/flutter_localizations.dart'
    show GlobalWidgetsLocalizations;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart';

import '../session/session_builder.dart';

/// Builds a `MaterialApp` or `MaterialApp.router` with the shared delegates,
/// a session and the theme, so a test never assembles its own.
final class TestApp {
  /// Creates the harness. [delegates] are the ones of the microfrontend under
  /// test and are added after the shared ones.
  const TestApp({
    this.locale = const Locale('es'),
    this.delegates = const [],
    this.session,
    this.clock,
  });

  /// Locale of the app.
  final Locale locale;

  /// Delegates of the microfrontend under test, added to the shared ones.
  final List<LocalizationsDelegate<Object?>> delegates;

  /// Session that `context.can` and `AccessGate` see. Null means a signed-in
  /// session built with `SessionBuilder()`.
  final UserSession? session;

  /// Clock of the access scope. Null means `systemClock`.
  final Clock? clock;

  /// A `MaterialApp` whose home is [home]. It adds no `Scaffold`, so [home]
  /// brings its own when it needs one.
  Widget wrap(Widget home) {
    final session = _session();
    return MaterialApp(
      theme: AppTheme.light(),
      locale: locale,
      supportedLocales: supportedLocales,
      localizationsDelegates: _delegates,
      builder: (context, child) => _scoped(session, child!),
      home: home,
    );
  }

  /// An app that runs [router].
  Widget wrapRouter(GoRouter router) {
    final session = _session();
    return MaterialApp.router(
      theme: AppTheme.light(),
      locale: locale,
      supportedLocales: supportedLocales,
      localizationsDelegates: _delegates,
      builder: (context, child) => _scoped(session, child!),
      routerConfig: router,
    );
  }

  /// Pumps `wrap(home)` and lets the first frame settle with one `pump`.
  Future<void> pump(WidgetTester tester, Widget home) async {
    await tester.pumpWidget(wrap(home));
    await tester.pump();
  }

  List<LocalizationsDelegate<Object?>> get _delegates => [
    AppLocalizations.delegate,
    ...GlobalMaterialLocalizations.delegates,
    GlobalWidgetsLocalizations.delegate,
    ...delegates,
  ];

  ValueNotifier<UserSession> _session() =>
      ValueNotifier(session ?? SessionBuilder().build());

  Widget _scoped(ValueNotifier<UserSession> session, Widget child) =>
      ShellAccessScope(
        session: session,
        clock: clock ?? systemClock,
        child: child,
      );
}
