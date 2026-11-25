import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mf_reports/mf_reports.dart';
import 'package:mf_reports/src/data/reports_repository.dart';
import 'package:mf_reports/src/l10n/generated/reports_localizations.dart';
import 'package:mf_reports/src/shared/constants/reports_paths.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

/// Harness of the reports screens: the real manifest routes over a session
/// that can read reports, and generate them unless [canWrite] is false.
final class ReportsTestApp {
  const ReportsTestApp({
    this.locale = const Locale('es'),
    this.canWrite = true,
  });

  /// Texts in Spanish, to find widgets by their text.
  static ReportsLocalizations get es =>
      lookupReportsLocalizations(const Locale('es'));

  /// Texts in English.
  static ReportsLocalizations get en =>
      lookupReportsLocalizations(const Locale('en'));

  final Locale locale;

  /// Whether the session may generate reports.
  final bool canWrite;

  /// App that runs the manifest routes from [location].
  Widget wrap(
    MicrofrontendScope scope, {
    String location = ReportsPaths.catalog,
  }) {
    final router = GoRouter(
      initialLocation: location,
      routes: reportsManifest.buildRoutes(
        DeferredLibraryLoader().page,
        () => scope,
      ),
    );
    return TestApp(locale: locale, session: _session()).wrapRouter(router);
  }

  /// Scope of one identity in demo mode. Each call is a new identity.
  static MicrofrontendScope newScope() => TestScope().scope;

  /// Scope whose repository is [repository].
  static MicrofrontendScope scopeWith(ReportsRepository repository) =>
      TestScope().withRepository<ReportsRepository>(repository).scope;

  /// Pumps [screen] alone, without the router, with the texts of the
  /// microfrontend installed around it.
  Future<void> pumpScreen(WidgetTester tester, Widget screen) =>
      tester.pumpWidget(
        TestApp(locale: locale, session: _session()).wrap(
          DeferredLocalizations(
            delegates: const [ReportsLocalizations.delegate],
            child: screen,
          ),
        ),
      );

  /// Pumps the app over a scope that holds [repository].
  Future<void> pump(
    WidgetTester tester,
    ReportsRepository repository, {
    String location = ReportsPaths.catalog,
  }) => tester.pumpWidget(wrap(scopeWith(repository), location: location));

  UserSession _session() => SessionBuilder().withPermissions([
    Permission.reportsRead,
    if (canWrite) Permission.reportsWrite,
  ]).build();
}
