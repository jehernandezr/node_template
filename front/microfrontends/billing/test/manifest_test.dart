import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mf_billing/mf_billing.dart';
import 'package:shell_core/shell_core.dart';

Widget _loader({
  required Future<void> Function() loadLibrary,
  required Widget Function() builder,
  Widget? loading,
  Widget Function(Object error, VoidCallback retry)? errorBuilder,
}) => const SizedBox.shrink();

MicrofrontendScope _scope() => MicrofrontendScope(
  DefaultShellServices(
    session: UserSession.anonymous(),
    eventBus: ShellEventBus(),
  ),
);

String _join(String prefix, String path) =>
    path.startsWith('/') ? path : '$prefix/$path';

/// Every [GoRoute] below [routes], by joined path.
Map<String, GoRoute> _byPath(List<RouteBase> routes, [String prefix = '']) => {
  for (final route in routes.whereType<GoRoute>()) ...{
    _join(prefix, route.path): route,
    ..._byPath(route.routes, _join(prefix, route.path)),
  },
};

final _importPattern = RegExp(
  r'''^(?:import|export)\s+'([^']+)'([^;]*);''',
  multiLine: true,
);

void main() {
  test('manifest id matches package', () {
    expect(billingManifest.id, MicrofrontendId.billing);
  });

  test('routes are nested under /billing', () {
    final routes = billingManifest.buildRoutes(_loader, _scope);
    expect(_byPath(routes).keys.toList(), [
      '/billing',
      '/billing/invoices',
      '/billing/invoices/:id',
    ]);
  });

  test('the manifest has no legacy lifecycle', () {
    expect(billingManifest.lifecycle, isNull);
    expect(billingManifest.screens, hasLength(1));
  });

  test('access: the manifest needs the billing permission', () {
    final allowed = UserSession(
      userId: 'u',
      permissions: {Permission.billingRead},
    );
    expect(billingManifest.access.allows(allowed), isTrue);
    expect(billingManifest.access.allows(UserSession(userId: 'u')), isFalse);
    expect(billingManifest.access.allows(UserSession.anonymous()), isFalse);
  });

  test('access: sub-routes carry the billing rule', () {
    final plan = billingManifest.screens.single;
    final invoices = plan.routes.single;
    final invoice = invoices.routes.single;
    expect(plan.access, isNull);
    for (final route in [invoices, invoice]) {
      expect(route.access, isNotNull);
      expect(
        route.access!.allows(
          UserSession(userId: 'u', permissions: {Permission.billingRead}),
        ),
        isTrue,
      );
      expect(route.access!.allows(UserSession(userId: 'u')), isFalse);
    }
    final routes = _byPath(billingManifest.buildRoutes(_loader, _scope));
    expect(routes['/billing']!.redirect, isNull);
    expect(routes['/billing/invoices']!.redirect, isNotNull);
    expect(routes['/billing/invoices/:id']!.redirect, isNotNull);
  });

  test('the manifest imports the screens library as deferred', () {
    final source = File('lib/mf_billing.dart').readAsStringSync();
    expect(source, contains("billing_screens.dart' deferred as screens"));
  });

  test('the manifest reaches no data, screens or l10n code without '
      'deferring it', () {
    final root = Directory.current.absolute.path;
    final visited = <String>{};
    final offenders = <String>[];

    void visit(File file) {
      if (!visited.add(file.path)) return;
      final source = file.readAsStringSync();
      for (final match in _importPattern.allMatches(source)) {
        final uri = match.group(1)!;
        if ((match.group(2) ?? '').contains('deferred')) continue;
        final String path;
        if (uri.startsWith('package:mf_billing/')) {
          path = '$root/lib/${uri.substring('package:mf_billing/'.length)}';
        } else if (!uri.contains(':')) {
          path = file.parent.uri.resolve(uri).toFilePath();
        } else {
          continue;
        }
        if (RegExp(r'/src/(data|screens|l10n)/').hasMatch(path)) {
          offenders.add('${file.path} -> $path');
          continue;
        }
        visit(File(path));
      }
    }

    visit(File('$root/lib/mf_billing.dart'));

    expect(visited.length, greaterThan(1), reason: 'the walk must run');
    expect(offenders, isEmpty);
  });
}
