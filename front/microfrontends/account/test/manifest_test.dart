import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_account/mf_account.dart';
import 'package:shell_core/shell_core.dart';

import 'support/manifest_app.dart';
import 'support/test_app.dart';

/// Rutas completas de un árbol de [ScreenRoute], con los hijos relativos
/// resueltos, y su regla de acceso propia.
Iterable<(String, AccessRule?)> _screens(
  List<ScreenRoute> routes, [
  String parent = '',
]) sync* {
  for (final route in routes) {
    final path = route.path.startsWith('/')
        ? route.path
        : '$parent/${route.path}';
    yield (path, route.access);
    yield* _screens(route.routes, path);
  }
}

void main() {
  setUp(resetDeferredPageCache);

  test('manifest id, menu and legacy API', () {
    expect(accountManifest.id, MicrofrontendId.account);
    expect(accountManifest.menu.single.path, '/account');
    expect(accountManifest.hasLifecycle, isFalse);
    expect(accountManifest.lifecycle, isNull);
  });

  test('every screen lives under /account, with the sections nested', () {
    final screens = _screens(accountManifest.screens).toList();
    expect(
      [for (final (path, _) in screens) path],
      [
        '/account',
        '/account/sessions',
        '/account/devices',
        '/account/security',
        '/account/agreements',
      ],
    );
  });

  test('only security asks for a recent second factor', () {
    final access = {
      for (final (path, rule) in _screens(accountManifest.screens)) path: rule,
    };
    expect(access['/account/security'], isNotNull);
    expect(access['/account'], isNull);
    expect(access['/account/sessions'], isNull);
    expect(access['/account/devices'], isNull);
    expect(access['/account/agreements'], isNull);
  });

  testWidgets('every route builds its screen', (tester) async {
    final es = await loadEs();
    final titles = {
      '/account': es.overviewTitle,
      '/account/sessions': es.sessionsTitle,
      '/account/devices': es.devicesTitle,
      '/account/security': es.securityTitle,
      '/account/agreements': es.agreementsTitle,
    };
    for (final entry in titles.entries) {
      final router = await pumpAccountRoutes(
        tester,
        location: entry.key,
        session: testSession(mfaFresh: true),
      );
      expect(currentPath(router), entry.key);
      expect(find.text(entry.value), findsWidgets, reason: entry.key);
      await tester.pumpWidget(const SizedBox());
    }
  });

  testWidgets('security without a recent second factor goes to step-up', (
    tester,
  ) async {
    final router = await pumpAccountRoutes(
      tester,
      location: '/account/security',
    );
    expect(currentPath(router), '/step-up');
    expect(find.text('step-up page'), findsOneWidget);
  });

  testWidgets('security with a recent second factor opens', (tester) async {
    final es = await loadEs();
    final router = await pumpAccountRoutes(
      tester,
      location: '/account/security',
      session: testSession(mfaFresh: true),
    );
    expect(currentPath(router), '/account/security');
    expect(find.text(es.securityTitle), findsWidgets);
  });

  testWidgets('the other sections open without a second factor', (
    tester,
  ) async {
    final router = await pumpAccountRoutes(
      tester,
      location: '/account/sessions',
    );
    expect(currentPath(router), '/account/sessions');
  });
}
