import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_backoffice/mf_backoffice.dart';
import 'package:mf_backoffice/src/l10n/generated/backoffice_localizations.dart';
import 'package:shell_core/shell_core.dart';

/// Full paths of every route, including nested children.
Iterable<String> _fullPaths(
  List<RouteBase> routes, [
  String parent = '',
]) sync* {
  for (final route in routes.whereType<GoRoute>()) {
    final full = route.path.startsWith('/')
        ? route.path
        : '$parent/${route.path}';
    yield full;
    yield* _fullPaths(route.routes, full);
  }
}

MicrofrontendScope _newScope() => MicrofrontendScope(
  DefaultShellServices(
    session: UserSession.anonymous(),
    eventBus: ShellEventBus(),
  ),
);

void main() {
  test('manifest id matches package', () {
    expect(backofficeManifest.id, MicrofrontendId.backoffice);
  });

  test('every route lives under /backoffice and includes the queue route', () {
    final routes = backofficeManifest.routes(deferredPage, _newScope);
    final paths = _fullPaths(routes).toList();
    expect(
      paths,
      containsAll(['/backoffice', '/backoffice/dlq', '/backoffice/dlq/:queue']),
    );
    expect(paths, contains('/backoffice/tenants/:id'));
    expect(paths, contains('/backoffice/sagas/:id'));
    for (final path in paths) {
      expect(path, startsWith('/backoffice'));
    }
  });

  testWidgets('dlq/:queue shows the messages of that queue in Spanish', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1280, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    final scope = _newScope();
    final router = GoRouter(
      initialLocation: '/backoffice/dlq/notifications-tasks-events',
      routes: backofficeManifest.routes(deferredPage, () => scope),
    );
    await tester.pumpWidget(
      MaterialApp.router(
        routerConfig: router,
        locale: const Locale('es'),
        supportedLocales: const [Locale('es'), Locale('en')],
        // No BackofficeLocalizations delegate here: the strings must come from the
        // Localizations.override applied by the deferred entry point.
        localizationsDelegates: const [
          AppLocalizations.delegate,
          ...GlobalMaterialLocalizations.delegates,
        ],
      ),
    );
    await tester.pumpAndSettle();

    final es = lookupBackofficeLocalizations(const Locale('es'));
    expect(
      find.text('${es.dlqMessagesTitle}: notifications-tasks-events'),
      findsOneWidget,
    );
    expect(find.textContaining('SMTP timeout tras 30 s'), findsNWidgets(3));
    expect(find.text(es.dlqSelectQueue), findsNothing);
  });
}
