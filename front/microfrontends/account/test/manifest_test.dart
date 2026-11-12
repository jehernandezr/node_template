import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mf_account/mf_account.dart';
import 'package:shell_core/shell_core.dart';

/// Rutas completas de un árbol de GoRoute, con los hijos relativos resueltos.
Iterable<String> _fullPaths(List<RouteBase> routes, [String parent = '']) sync* {
  for (final route in routes.whereType<GoRoute>()) {
    final path = route.path.startsWith('/') ? route.path : '$parent/${route.path}';
    yield path;
    yield* _fullPaths(route.routes, path);
  }
}

void main() {
  test('manifest id and menu match the package', () {
    expect(accountManifest.id, MicrofrontendId.account);
    expect(accountManifest.menu.single.path, '/account');
  });

  test('every route lives under /account, with the sections nested', () {
    // The scope accessor is only called when a screen builds, so it is not called here.
    final routes = accountManifest.routes(
      deferredPage,
      () => throw StateError('scope is not needed to build routes'),
    );
    final paths = _fullPaths(routes).toList();
    expect(paths, [
      '/account',
      '/account/sessions',
      '/account/devices',
      '/account/security',
      '/account/agreements',
    ]);
    for (final path in paths) {
      expect(path, startsWith('/account'));
    }
  });
}
